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
 * CompanyCam sends signature in the `X-CompanyCam-Signature` header, hex-encoded.
 */
function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha1", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  // Accept either "sha1=..." or raw hex
  const provided = signature.startsWith("sha1=")
    ? signature.slice(5)
    : signature;

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
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

  if (!verifySignature(rawBody, signature, secret)) {
    console.warn("[companycam webhook] invalid signature");
    return ack({ ok: false, reason: "invalid_signature" });
  }

  let event: CCWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return ack({ ok: false, reason: "invalid_json" });
  }

  const type = event.type || "";
  console.log(`[companycam webhook] received ${type}`);

  try {
    const supabase = createAdminClient();

    switch (type) {
      case "project.created":
      case "project.updated": {
        const cc = extractObject<CCProject>(event);
        if (!cc?.id) {
          return ack({ ok: false, reason: "missing_project" });
        }
        const rowId = await upsertProjectFromCC(supabase, cc);
        return ack({ ok: true, type, projectRowId: rowId });
      }

      case "photo.created": {
        const cc = extractObject<CCPhoto>(event);
        if (!cc?.id) return ack({ ok: false, reason: "missing_photo" });
        if (!cc.project_id) {
          return ack({ ok: false, reason: "photo_without_project" });
        }

        // Find (or auto-create) the project row
        const { data: project } = await supabase
          .from("projects")
          .select("id")
          .eq("companycam_id", cc.project_id)
          .maybeSingle();

        if (!project) {
          console.warn(
            `[companycam webhook] photo ${cc.id} references unknown project ${cc.project_id}`
          );
          return ack({ ok: false, reason: "project_not_found" });
        }

        const ok = await importPhotoFromCC(supabase, cc, project.id);
        return ack({ ok, type });
      }

      default:
        return ack({ ok: true, type, note: "ignored" });
    }
  } catch (err) {
    console.error("[companycam webhook] handler error", err);
    // Still 200 so CompanyCam doesn't retry forever on a bug on our side
    return ack({
      ok: false,
      reason: "handler_error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
