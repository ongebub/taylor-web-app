import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail, upsertContactToList } from "@/lib/brevo";
import { GOOGLE_REVIEW_URL } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Incoming = {
  project_id?: string;
  referrer_name?: string;
  referrer_email?: string;
  referrals?: { email?: string; name?: string }[];
};

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function buildEmailBody(
  referrerName: string,
  referredName: string | null,
  projectType: string
): { html: string; text: string } {
  const greeting = referredName ? `Hi ${referredName},` : "Hi,";
  const projectPhrase = projectType
    ? projectType.toLowerCase()
    : "home improvement project";

  const text = [
    greeting,
    "",
    `Your friend ${referrerName} just had their ${projectPhrase} done by Taylor Exteriors & Construction in Des Moines and wanted to share their experience.`,
    "",
    `${referrerName} left us a 5-star Google review — you can read it here: ${GOOGLE_REVIEW_URL}`,
    "",
    "If you're thinking about roofing, siding, windows, decking or storm damage repair, we'd love to help.",
    "",
    `As a thank-you, if you sign a contract over $5,000 we'll send ${referrerName} a $100 Amazon gift card.`,
    "",
    "Taylor Exteriors & Construction",
    "515-953-4000",
    "info@taylorext.com",
    "taylorext.com",
    "'Built to Last. Backed by Honesty.'",
  ].join("\n");

  const html = `
<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#1f2937;line-height:1.55">
  <p>${greeting}</p>
  <p>Your friend <strong>${referrerName}</strong> just had their ${projectPhrase} done by
     Taylor Exteriors &amp; Construction in Des Moines and wanted to share their experience.</p>
  <p>${referrerName} left us a 5-star Google review —
     <a href="${GOOGLE_REVIEW_URL}" style="color:#ea580c">you can read it here</a>.</p>
  <p>If you&rsquo;re thinking about roofing, siding, windows, decking or storm damage repair,
     we&rsquo;d love to help.</p>
  <p>As a thank-you, if you sign a contract over $5,000 we&rsquo;ll send
     ${referrerName} a <strong>$100 Amazon gift card</strong>.</p>
  <p style="margin-top:28px;color:#374151">
    <strong>Taylor Exteriors &amp; Construction</strong><br>
    <a href="tel:515-953-4000" style="color:#374151">515-953-4000</a><br>
    <a href="mailto:info@taylorext.com" style="color:#374151">info@taylorext.com</a><br>
    <a href="https://taylorext.com" style="color:#374151">taylorext.com</a><br>
    <em>&ldquo;Built to Last. Backed by Honesty.&rdquo;</em>
  </p>
</div>`.trim();

  return { html, text };
}

export async function POST(request: NextRequest) {
  let body: Incoming;
  try {
    body = (await request.json()) as Incoming;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid JSON" },
      { status: 400 }
    );
  }

  if (!body.project_id || !body.referrer_name || !Array.isArray(body.referrals)) {
    return NextResponse.json(
      { ok: false, error: "project_id, referrer_name, referrals are required" },
      { status: 400 }
    );
  }

  const cleaned = body.referrals
    .map((r) => ({
      email: (r.email || "").trim().toLowerCase(),
      name: (r.name || "").trim() || null,
    }))
    .filter((r) => r.email && isEmail(r.email));

  if (cleaned.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no valid emails" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Pull project for type (used in email copy) — admin client bypasses RLS
  const { data: project } = await supabase
    .from("projects")
    .select("id, project_type")
    .eq("id", body.project_id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "project not found" },
      { status: 404 }
    );
  }

  const listIdRaw = process.env.BREVO_REFERRAL_LIST_ID;
  const listId = listIdRaw ? Number.parseInt(listIdRaw, 10) : NaN;
  const hasList = Number.isFinite(listId);

  const results = await Promise.all(
    cleaned.map(async (r) => {
      const { html, text } = buildEmailBody(
        body.referrer_name!,
        r.name,
        project.project_type
      );

      // 1. Insert row (always, even if email/list fail — we still want a record)
      const { data: inserted, error: insertError } = await supabase
        .from("referrals")
        .insert({
          project_id: body.project_id,
          referrer_name: body.referrer_name,
          referrer_email: body.referrer_email || null,
          referred_email: r.email,
          referred_name: r.name,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[referrals] insert failed", r.email, insertError.message);
        return { email: r.email, ok: false, error: insertError.message };
      }

      // 2. Send email
      const emailResult = await sendTransactionalEmail({
        to: { email: r.email, name: r.name || undefined },
        subject: `${body.referrer_name} thinks you need to meet Taylor Exteriors`,
        htmlContent: html,
        textContent: text,
      });

      if (emailResult.ok) {
        await supabase
          .from("referrals")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", inserted.id);
      } else {
        console.error("[referrals] email failed", r.email, emailResult.error);
      }

      // 3. Add to Brevo marketing list (best-effort)
      if (hasList) {
        const listResult = await upsertContactToList({
          email: r.email,
          firstName: r.name || undefined,
          listId,
        });
        if (!listResult.ok) {
          console.error(
            "[referrals] list add failed",
            r.email,
            listResult.error
          );
        }
      }

      return {
        email: r.email,
        ok: true,
        email_sent: emailResult.ok,
        list_added: hasList,
      };
    })
  );

  const anyFailed = results.some((r) => !r.ok);
  return NextResponse.json({
    ok: !anyFailed,
    count: results.length,
    results,
  });
}
