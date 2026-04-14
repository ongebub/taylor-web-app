import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/brevo";
import { COMPANY_EMAIL, COMPANY_PHONE } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Incoming = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  service?: string;
  message?: string;
  source?: string;
  referral_id?: string | null;
};

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  const first = (body.first_name || "").trim();
  const last = (body.last_name || "").trim();
  const phone = (body.phone || "").trim();
  const email = (body.email || "").trim();

  if (!first || !last) {
    return NextResponse.json(
      { ok: false, error: "first and last name are required" },
      { status: 400 }
    );
  }
  if (!phone) {
    return NextResponse.json(
      { ok: false, error: "phone is required" },
      { status: 400 }
    );
  }
  if (email && !isEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "invalid email" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const referralId = body.referral_id && body.referral_id.trim() ? body.referral_id.trim() : null;
  const source = (body.source || (referralId ? "referral" : "estimate")).trim();

  const { data: inserted, error: insertError } = await supabase
    .from("leads")
    .insert({
      first_name: first,
      last_name: last,
      phone,
      email: email || null,
      address: (body.address || "").trim() || null,
      service: (body.service || "").trim() || null,
      message: (body.message || "").trim() || null,
      source,
      referral_id: referralId,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[leads] insert failed", insertError.message);
    return NextResponse.json(
      { ok: false, error: insertError.message },
      { status: 500 }
    );
  }

  const fullName = `${first} ${last}`;
  const serviceLabel = body.service || "Not specified";

  // 1. Confirmation to the lead (best effort)
  if (email) {
    const confirmText = [
      `Thanks ${first},`,
      "",
      "We got your request and will call you within 1 business day.",
      "",
      `Questions? Call or text us at ${COMPANY_PHONE}.`,
      "",
      "— Taylor Exteriors & Construction",
    ].join("\n");

    const confirmHtml = `
<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#1f2937;line-height:1.55;max-width:520px">
  <p>Thanks ${escapeHtml(first)},</p>
  <p>We got your request and will call you within <strong>1 business day</strong>.</p>
  <p>Questions?
    <a href="tel:${COMPANY_PHONE.replace(/\D/g, "")}" style="color:#e8621a;font-weight:600">
      Call or text ${escapeHtml(COMPANY_PHONE)}
    </a>.</p>
  <p style="margin-top:24px;color:#374151">
    — Taylor Exteriors &amp; Construction<br>
    <em style="color:#6b7280">&ldquo;Built to Last. Backed by Honesty.&rdquo;</em>
  </p>
</div>`.trim();

    const emailResult = await sendTransactionalEmail({
      to: { email, name: fullName },
      subject: "We'll be in touch soon! — Taylor Exteriors",
      htmlContent: confirmHtml,
      textContent: confirmText,
    });
    if (!emailResult.ok) {
      console.error("[leads] confirmation email failed", emailResult.error);
    }
  }

  // 2. Notification to info@taylorext.com (best effort)
  const notifyLines = [
    `Name:       ${fullName}`,
    `Phone:      ${phone}`,
    `Email:      ${email || "—"}`,
    `Address:    ${body.address || "—"}`,
    `Service:    ${serviceLabel}`,
    `Source:     ${source}${referralId ? ` (referral_id=${referralId})` : ""}`,
    "",
    "Message:",
    body.message || "(no message)",
  ];

  const notifyHtml = `
<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.55">
  <h2 style="margin:0 0 12px;font-size:18px;color:#0b1a2e">New ${escapeHtml(source)} lead</h2>
  <table style="border-collapse:collapse">
    <tbody>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Name</td><td><strong>${escapeHtml(fullName)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Phone</td><td><a href="tel:${phone.replace(/\D/g, "")}" style="color:#e8621a">${escapeHtml(phone)}</a></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Email</td><td>${email ? `<a href="mailto:${escapeHtml(email)}" style="color:#e8621a">${escapeHtml(email)}</a>` : "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Address</td><td>${escapeHtml(body.address || "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Service</td><td>${escapeHtml(serviceLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Source</td><td>${escapeHtml(source)}${referralId ? ` <span style="color:#6b7280">(${escapeHtml(referralId)})</span>` : ""}</td></tr>
    </tbody>
  </table>
  <p style="margin-top:16px;color:#374151"><strong>Message</strong></p>
  <p style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;color:#111827">${escapeHtml(body.message || "(no message)")}</p>
</div>`.trim();

  const notifyResult = await sendTransactionalEmail({
    to: { email: COMPANY_EMAIL, name: "Taylor Exteriors" },
    subject: `New ${source} lead: ${fullName} — ${serviceLabel}`,
    htmlContent: notifyHtml,
    textContent: notifyLines.join("\n"),
  });
  if (!notifyResult.ok) {
    console.error("[leads] notify email failed", notifyResult.error);
  }

  return NextResponse.json({
    ok: true,
    id: inserted?.id,
  });
}
