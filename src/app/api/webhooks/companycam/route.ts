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

/**
 * Unwrap the project/photo object from any of the common webhook shapes.
 * Current CompanyCam format nests under `payload.project` / `payload.photo`;
 * older/alternate shapes are kept as fallbacks.
 */
function extractObject<T>(
  event: CCWebhookEvent,
  kind: "project" | "photo"
): T | null {
  const e = event as unknown as Record<string, unknown>;
  const payload = (e.payload as Record<string, unknown> | undefined) || {};

  const candidate =
    (payload[kind] as unknown) ||
    (e[kind] as unknown) ||
    (payload.event_object as unknown) ||
    (payload.data as unknown) ||
    (e.event_object as unknown) ||
    (e.data as unknown) ||
    e.resource ||
    null;

  return (candidate as T) || null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-companycam-signature");
  const secret = process.env.COMPANYCAM_WEBHOOK_SECRET;

  // Always acknowledge, even on failure, so CompanyCam doesn't spam retries.
  const ack = (body: Record<string, unknown>) =>
    NextResponse.json(body, { status: 200 });

  if (!secret) {
    console.error("[companycam] COMPANYCAM_WEBHOOK_SECRET not set");
    return ack({ ok: false, reason: "secret_not_configured" });
  }

  if (!verifySignature(rawBody, signature, secret).ok) {
    console.error("[companycam] invalid signature");
    return ack({ ok: false, reason: "invalid_signature" });
  }

  let event: CCWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error("[companycam] invalid JSON");
    return ack({ ok: false, reason: "invalid_json" });
  }

  // CompanyCam sends `event_type`; older docs show `type`. Accept either.
  const raw = event as unknown as Record<string, unknown>;
  const type =
    (typeof raw.event_type === "string" && raw.event_type) ||
    (typeof raw.type === "string" && raw.type) ||
    "";

  // Normalize: treat "project_created", "project.created", "project/created" the same
  const normType = type.replace(/[._/]/g, ".");

  try {
    const supabase = createAdminClient();

    if (normType.startsWith("project.")) {
      const cc = extractObject<CCProject>(event, "project");
      if (!cc?.id) {
        console.error(`[companycam] ${type}: missing project id`);
        return ack({ ok: false, reason: "missing_project", type });
      }
      const rowId = await upsertProjectFromCC(supabase, cc);
      console.log(`[companycam] project created: ${cc.name}`);
      return ack({ ok: true, type, projectRowId: rowId });
    }

    if (normType.startsWith("photo.")) {
      const cc = extractObject<CCPhoto>(event, "photo");
      if (!cc?.id) {
        console.error(`[companycam] ${type}: missing photo id`);
        return ack({ ok: false, reason: "missing_photo", type });
      }
      if (!cc.project_id) {
        console.error(`[companycam] photo ${cc.id}: no project_id`);
        return ack({ ok: false, reason: "photo_without_project", type });
      }

      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("companycam_id", cc.project_id)
        .maybeSingle();

      if (!project) {
        console.error(
          `[companycam] photo ${cc.id}: unknown project ${cc.project_id}`
        );
        return ack({ ok: false, reason: "project_not_found", type });
      }

      const ok = await importPhotoFromCC(supabase, cc, project.id);
      if (!ok) {
        console.error(`[companycam] photo ${cc.id}: import failed`);
        return ack({ ok: false, type });
      }
      console.log(`[companycam] photo imported: ${cc.id}`);
      return ack({ ok: true, type });
    }

    return ack({ ok: true, type, note: "ignored" });
  } catch (err) {
    console.error(
      "[companycam] handler error",
      err instanceof Error ? err.stack || err.message : err
    );
    return ack({
      ok: false,
      reason: "handler_error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
