import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  importPhotoFromCC,
  upsertProjectFromCC,
} from "@/lib/companycam/sync";
import type { CCPhoto, CCProject, CCWebhookEvent } from "@/lib/companycam/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Timing-safe HMAC-SHA1 signature check.
 * CompanyCam sends signature in the `X-CompanyCam-Signature` header, base64-encoded.
 */
function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string
): { ok: boolean; expected: string; provided: string } {
  const expected = crypto
    .createHmac("sha1", secret)
    .update(rawBody)
    .digest("base64");

  const provided = signature?.startsWith("sha1=")
    ? signature.slice(5)
    : signature ?? "";

  if (!provided) return { ok: false, expected, provided };

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { ok: false, expected, provided };
  return { ok: crypto.timingSafeEqual(a, b), expected, provided };
}

/** Unwrap the project/photo object from any of the common webhook shapes. */
function extractObject<T>(event: CCWebhookEvent): T | null {
  const e = event as unknown as Record<string, unknown>;
  const candidate =
    (event.project as unknown) ||
    (event.photo as unknown) ||
    (event.event_object as unknown) ||
    (event.data as unknown) ||
    e.resource ||
    null;
  return (candidate as T) || null;
}

export async function POST(request: NextRequest) {
  console.log(
    "[env check]",
    Object.keys(process.env).filter(
      (k) => k.includes("COMPANY") || k.includes("WEBHOOK")
    )
  );

  const rawBody = await request.text();
  const signature = request.headers.get("x-companycam-signature");
  const secret = process.env.COMPANYCAM_WEBHOOK_SECRET;

  // Always acknowledge, even on failure, so CompanyCam doesn't spam retries.
  // (We return 200 with a JSON body indicating what happened for observability.)
  const ack = (body: Record<string, unknown>) =>
    NextResponse.json(body, { status: 200 });

  if (!secret) {
    console.error("[companycam webhook] COMPANYCAM_WEBHOOK_SECRET not set");
    return ack({ ok: false, reason: "secret_not_configured" });
  }

  const sig = verifySignature(rawBody, signature, secret);
  console.log(
    `[companycam webhook] sig check received=${sig.provided.slice(0, 10)} expected=${sig.expected.slice(0, 10)}`
  );
  if (!sig.ok) {
    console.warn("[companycam webhook] invalid signature");
    return ack({ ok: false, reason: "invalid_signature" });
  }

  let event: CCWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return ack({ ok: false, reason: "invalid_json" });
  }

  // CompanyCam sends `event_type`; older docs show `type`. Accept either.
  const raw = event as unknown as Record<string, unknown>;
  const type =
    (typeof raw.event_type === "string" && raw.event_type) ||
    (typeof raw.type === "string" && raw.type) ||
    "";

  console.log("[companycam webhook] payload keys", Object.keys(raw));
  console.log(`[companycam webhook] event_type=${type}`);
  console.log(
    "[companycam webhook] payload preview",
    JSON.stringify(raw).slice(0, 500)
  );

  // Normalize: treat "project_created", "project.created", "project/created" the same
  const normType = type.replace(/[._/]/g, ".");

  try {
    const supabase = createAdminClient();

    if (normType.startsWith("project.")) {
      console.log("[companycam webhook] matched project branch");
      const cc = extractObject<CCProject>(event);
      console.log(
        `[companycam webhook] project extract id=${cc?.id} name=${cc?.name}`
      );
      if (!cc?.id) {
        return ack({ ok: false, reason: "missing_project", type });
      }
      const rowId = await upsertProjectFromCC(supabase, cc);
      console.log(`[companycam webhook] upsert result rowId=${rowId}`);
      return ack({ ok: true, type, projectRowId: rowId });
    }

    if (normType.startsWith("photo.")) {
      console.log("[companycam webhook] matched photo branch");
      const cc = extractObject<CCPhoto>(event);
      console.log(
        `[companycam webhook] photo extract id=${cc?.id} project_id=${cc?.project_id}`
      );
      if (!cc?.id) return ack({ ok: false, reason: "missing_photo", type });
      if (!cc.project_id) {
        return ack({ ok: false, reason: "photo_without_project", type });
      }

      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("companycam_id", cc.project_id)
        .maybeSingle();

      if (!project) {
        console.warn(
          `[companycam webhook] photo ${cc.id} references unknown project ${cc.project_id}`
        );
        return ack({ ok: false, reason: "project_not_found", type });
      }

      const ok = await importPhotoFromCC(supabase, cc, project.id);
      console.log(`[companycam webhook] photo import ok=${ok}`);
      return ack({ ok, type });
    }

    console.log(`[companycam webhook] no handler for type=${type}`);
    return ack({ ok: true, type, note: "ignored" });
  } catch (err) {
    console.error(
      "[companycam webhook] handler error",
      err instanceof Error ? err.stack || err.message : err
    );
    return ack({
      ok: false,
      reason: "handler_error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
