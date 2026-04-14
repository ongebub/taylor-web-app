import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail, upsertContactToList } from "@/lib/brevo";
import { APP_URL, GOOGLE_REVIEW_URL } from "@/lib/config";

const LOGO_URL =
  "https://static.wixstatic.com/media/c8f2dc_45dae5be2cab45c1a964279915378377~mv2.png";
const NAVY = "#0b1a2e";
const ORANGE = "#e8621a";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function buildEmailBody(opts: {
  referrerName: string;
  referredName: string | null;
  projectType: string;
  referralId: string;
}): { html: string; text: string } {
  const { referrerName, referredName, projectType, referralId } = opts;
  const greeting = referredName
    ? `Hey ${referredName}!`
    : "Hey!";
  const projectPhrase = projectType
    ? projectType.toLowerCase()
    : "home improvement project";
  const estimateUrl = `${APP_URL.replace(/\/$/, "")}/estimate?ref=${encodeURIComponent(
    referralId
  )}`;

  const text = [
    greeting,
    "",
    `Your friend ${referrerName} just had their ${projectPhrase} done by Taylor Exteriors & Construction and wanted to pass along a great experience.`,
    "",
    `${referrerName} was kind enough to leave us a review — check it out: ${GOOGLE_REVIEW_URL}`,
    "",
    "If you've been thinking about a new roof, siding, windows, or deck — we'd love to help. We're local, honest, and we back everything we install.",
    "",
    `GET YOUR FREE ESTIMATE: ${estimateUrl}`,
    "",
    "Or reach us directly:",
    "Call or text: 515-953-4000",
    "",
    "Taylor Exteriors & Construction",
    "Des Moines, Iowa",
    "taylorext.com",
    "'Built to Last. Backed by Honesty.'",
    "",
    `You're receiving this because ${referrerName} thought you'd be interested. No hard feelings if not!`,
  ].join("\n");

  // Table-based email markup for broad client support.
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>A referral from ${escapeHtml(referrerName)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#1f2937;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(11,26,46,0.06)">

          <!-- Header -->
          <tr>
            <td align="center" style="background:${NAVY};padding:28px 24px 22px;border-bottom:4px solid ${ORANGE}">
              <img src="${LOGO_URL}" alt="Taylor Exteriors &amp; Construction" width="200" style="display:block;height:auto;max-width:200px;margin:0 auto">
              <p style="margin:14px 0 0;color:${ORANGE};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">
                Built to Last. Backed by Honesty.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px 28px 8px;font-size:16px;line-height:1.6;color:#1f2937">
              <p style="margin:0 0 14px;font-size:20px;font-weight:700;color:${NAVY}">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 16px">
                Your friend <strong>${escapeHtml(referrerName)}</strong> just had their
                ${escapeHtml(projectPhrase)} done by Taylor Exteriors &amp; Construction
                and wanted to pass along a great experience.
              </p>
              <p style="margin:0 0 10px">
                ${escapeHtml(referrerName)} was kind enough to leave us a review — check it out:
              </p>
              <p style="margin:0 0 22px">
                <a href="${GOOGLE_REVIEW_URL}" style="color:${ORANGE};font-weight:600;text-decoration:none">
                  Read the Google Review &rarr;
                </a>
              </p>
              <p style="margin:0 0 6px">
                If you&rsquo;ve been thinking about a new roof, siding, windows, or deck — we&rsquo;d love to help.
              </p>
              <p style="margin:0 0 4px;color:#4b5563;font-size:15px">
                We&rsquo;re local, honest, and we back everything we install.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:22px 28px 8px">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:${ORANGE};border-radius:12px">
                    <a href="${estimateUrl}"
                       style="display:inline-block;padding:16px 36px;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.5px;text-decoration:none;border-radius:12px">
                      GET YOUR FREE ESTIMATE
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0;font-size:12px;color:#6b7280">
                Takes about a minute. We&rsquo;ll call within 1 business day.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:24px 28px 0">
              <div style="border-top:1px solid #e5e7eb"></div>
            </td>
          </tr>

          <!-- Contact row -->
          <tr>
            <td style="padding:18px 28px 8px;text-align:center;font-size:15px;color:#374151">
              <p style="margin:0 0 8px;font-weight:600;color:${NAVY}">Or reach us directly</p>
              <p style="margin:0">
                <a href="tel:5159534000" style="color:${ORANGE};font-weight:700;font-size:18px;text-decoration:none">
                  📞 515-953-4000
                </a>
              </p>
              <p style="margin:6px 0 0;font-size:13px;color:#6b7280">
                <a href="tel:5159534000" style="color:#6b7280;text-decoration:none">Tap to call</a>
                &nbsp;·&nbsp;
                <a href="sms:5159534000" style="color:#6b7280;text-decoration:none">Text us</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 28px 28px;text-align:center;font-size:13px;color:#6b7280;line-height:1.55">
              <p style="margin:0;color:${NAVY};font-weight:700;font-size:14px">
                Taylor Exteriors &amp; Construction
              </p>
              <p style="margin:4px 0 0">
                Des Moines, Iowa &middot;
                <a href="https://taylorext.com" style="color:#6b7280;text-decoration:underline">taylorext.com</a>
              </p>
              <p style="margin:10px 0 0;font-style:italic;color:#9ca3af">
                &ldquo;Built to Last. Backed by Honesty.&rdquo;
              </p>
              <p style="margin:18px 0 0;font-size:11px;color:#9ca3af;line-height:1.5">
                You&rsquo;re receiving this because ${escapeHtml(referrerName)} thought
                you&rsquo;d be interested. No hard feelings if not!
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

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

      // 2. Build + send email now that we have the referral id for the CTA
      const { html, text } = buildEmailBody({
        referrerName: body.referrer_name!,
        referredName: r.name,
        projectType: project.project_type,
        referralId: inserted.id,
      });

      const emailResult = await sendTransactionalEmail({
        to: { email: r.email, name: r.name || undefined },
        subject: `${body.referrer_name} thinks you should meet Taylor Exteriors & Construction`,
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
