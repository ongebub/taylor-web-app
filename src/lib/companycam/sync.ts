import type { SupabaseClient } from "@supabase/supabase-js";
import { generateSlug } from "@/lib/utils";
import {
  bestPhotoUrl,
  listAllProjects,
  listProjectPhotos,
} from "./client";
import type { CCPhoto, CCProject } from "./types";

const PHOTO_BUCKET = "project-photos";

/** Map a CompanyCam project status to our allowed values. */
function mapStatus(ccStatus?: string | null): string {
  if (!ccStatus) return "scheduled";
  const s = ccStatus.toLowerCase();
  if (s.includes("complete") || s === "done") return "complete";
  if (s.includes("progress") || s === "active") return "in_progress";
  return "scheduled";
}

/** Build a unique slug by appending -2, -3 on collisions. */
async function uniqueSlug(
  supabase: SupabaseClient,
  base: string
): Promise<string> {
  const safeBase = base || "project";
  let candidate = safeBase;
  let attempt = 1;

  while (true) {
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    attempt += 1;
    candidate = `${safeBase}-${attempt}`;
  }
}

type AddressParts = {
  street_address: string;
  city: string;
  state: string;
  zip: string;
};

/**
 * Normalize CompanyCam address → our 4-column shape.
 * Prefers structured fields; falls back to parsing a comma-delimited string.
 * Format assumed: "123 Main St, Des Moines, IA 50309"
 */
function parseAddress(cc: CCProject): AddressParts {
  const a = cc.address as unknown;

  // String form — split on commas
  if (typeof a === "string") {
    const parts = a.split(",").map((s) => s.trim()).filter(Boolean);
    const [street = "", city = "", stateZip = ""] = parts;
    const [stateTok = "", zipTok = ""] = stateZip.split(/\s+/);
    return {
      street_address: street,
      city: city || "Des Moines",
      state: stateTok || "IA",
      zip: zipTok || "",
    };
  }

  // Structured form
  const obj = (a || {}) as {
    street_address_1?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
  };
  return {
    street_address: obj.street_address_1 || "",
    city: obj.city || "Des Moines",
    state: obj.state || "IA",
    zip: obj.postal_code || "",
  };
}

/**
 * Upsert a CompanyCam project into our projects table.
 * Returns the project row id (existing or new).
 */
export async function upsertProjectFromCC(
  supabase: SupabaseClient,
  cc: CCProject
): Promise<string | null> {
  // Already imported?
  const { data: existing } = await supabase
    .from("projects")
    .select("id, slug")
    .eq("companycam_id", cc.id)
    .maybeSingle();

  const addr = parseAddress(cc);
  const customerName = cc.name || "CompanyCam Project";

  if (existing) {
    // Update name/address on project.updated events
    await supabase
      .from("projects")
      .update({
        customer_name: customerName,
        street_address: addr.street_address,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        status: mapStatus(cc.status),
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const baseSlug = generateSlug(
    cc.name || "project",
    addr.street_address || cc.name || ""
  );
  const slug = await uniqueSlug(supabase, baseSlug);

  const { data: inserted, error } = await supabase
    .from("projects")
    .insert({
      slug,
      customer_name: customerName,
      street_address: addr.street_address,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      status: mapStatus(cc.status),
      companycam_id: cc.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[companycam] project insert failed", error.message);
    return null;
  }

  return inserted?.id || null;
}

/**
 * Download a photo from CompanyCam and upload it to Supabase Storage,
 * then insert a row in the photos table.
 * Idempotent: skips if companycam_photo_id already exists.
 */
export async function importPhotoFromCC(
  supabase: SupabaseClient,
  cc: CCPhoto,
  projectRowId: string
): Promise<boolean> {
  // Already imported?
  const { data: existing } = await supabase
    .from("photos")
    .select("id")
    .eq("companycam_photo_id", cc.id)
    .maybeSingle();
  if (existing) return true;

  const sourceUrl = bestPhotoUrl(cc);
  console.log(
    `[companycam] photo ${cc.id} uris=`,
    JSON.stringify(cc.uris).slice(0, 500)
  );
  console.log(`[companycam] photo ${cc.id} picked URL=${sourceUrl}`);
  if (!sourceUrl) {
    console.warn(`[companycam] photo ${cc.id} has no usable URL`);
    return false;
  }

  // Download (authenticated — CC image URLs can require a bearer token)
  const apiToken = process.env.COMPANYCAM_API_TOKEN;
  const res = await fetch(sourceUrl, {
    headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : {},
  });
  if (!res.ok) {
    const bodyPreview = await res.text().catch(() => "");
    console.error(
      `[companycam] failed to download photo ${cc.id} from ${sourceUrl}: ${res.status} ${bodyPreview.slice(0, 200)}`
    );
    return false;
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";

  // Prefer extension from the URL path (strip query string); fall back to
  // the MIME type, then .jpg. Never rely on the default .html content-type.
  const urlPath = sourceUrl.split("?")[0];
  const urlExt = urlPath.includes(".") ? urlPath.split(".").pop() : "";
  const mimeExt = contentType.split("/")[1]?.split(";")[0];
  const ext =
    (urlExt && urlExt.length <= 5 ? urlExt : "") ||
    (mimeExt && mimeExt !== "html" ? mimeExt : "") ||
    "jpg";
  const buffer = Buffer.from(await res.arrayBuffer());

  // Upload to Storage
  const filename = `${Date.now()}-${cc.id}.${ext}`;
  const storagePath = `${projectRowId}/during/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error(
      `[companycam] storage upload failed for ${cc.id} path=${storagePath}`,
      uploadError.message
    );
    return false;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath);
  console.log(`[companycam] stored photo ${cc.id} publicUrl=${publicUrl}`);

  const { error: insertError } = await supabase.from("photos").insert({
    project_id: projectRowId,
    storage_path: storagePath,
    public_url: publicUrl,
    phase: "during",
    caption: cc.description || null,
    companycam_photo_id: cc.id,
  });

  if (insertError) {
    console.error("[companycam] photo insert failed", insertError.message);
    // Clean up storage since row insert failed
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    return false;
  }

  return true;
}

/** Delete a photo (by CompanyCam id) from storage + DB. */
export async function deletePhotoByCCId(
  supabase: SupabaseClient,
  companycamPhotoId: string
): Promise<boolean> {
  const { data: row } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("companycam_photo_id", companycamPhotoId)
    .maybeSingle();
  if (!row) return false;

  if (row.storage_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([row.storage_path]);
  }
  await supabase.from("photos").delete().eq("id", row.id);
  return true;
}

export type SyncResult = {
  projectsImported: number;
  projectsSkipped: number;
  photosImported: number;
  photosSkipped: number;
  errors: string[];
};

/**
 * Full import: fetch every CompanyCam project + every photo and bring into Supabase.
 * Skips anything already imported (by companycam_id).
 */
export async function fullSyncFromCompanyCam(
  supabase: SupabaseClient,
  apiToken: string,
  onProgress?: (message: string) => void
): Promise<SyncResult> {
  const log = (msg: string) => {
    console.log(msg);
    onProgress?.(msg);
  };

  const result: SyncResult = {
    projectsImported: 0,
    projectsSkipped: 0,
    photosImported: 0,
    photosSkipped: 0,
    errors: [],
  };

  log("Fetching CompanyCam projects...");
  const projects = await listAllProjects(apiToken);
  log(`Found ${projects.length} projects in CompanyCam`);

  for (const cc of projects) {
    try {
      log(`Importing project: ${cc.name}...`);

      const { data: existing } = await supabase
        .from("projects")
        .select("id")
        .eq("companycam_id", cc.id)
        .maybeSingle();

      const wasExisting = !!existing;
      const projectRowId = await upsertProjectFromCC(supabase, cc);

      if (!projectRowId) {
        result.errors.push(`Failed to upsert project: ${cc.name}`);
        continue;
      }

      if (wasExisting) result.projectsSkipped += 1;
      else result.projectsImported += 1;

      // Photos
      const photos = await listProjectPhotos(apiToken, cc.id);
      log(`  → ${photos.length} photos`);

      for (const p of photos) {
        try {
          const { data: existingPhoto } = await supabase
            .from("photos")
            .select("id")
            .eq("companycam_photo_id", p.id)
            .maybeSingle();
          if (existingPhoto) {
            result.photosSkipped += 1;
            continue;
          }
          const ok = await importPhotoFromCC(supabase, p, projectRowId);
          if (ok) result.photosImported += 1;
          else result.errors.push(`Photo ${p.id} failed`);
        } catch (e) {
          result.errors.push(
            `Photo ${p.id}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    } catch (e) {
      result.errors.push(
        `Project ${cc.name}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  log(
    `Done. Projects: +${result.projectsImported} new, ${result.projectsSkipped} existing. Photos: +${result.photosImported} new, ${result.photosSkipped} existing. Errors: ${result.errors.length}`
  );

  return result;
}
