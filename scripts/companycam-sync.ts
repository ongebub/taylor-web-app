/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-time CompanyCam → Supabase import script.
 *
 * Usage:
 *   npx ts-node scripts/companycam-sync.ts
 *
 * Requires these in .env.local (automatically loaded):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   COMPANYCAM_API_TOKEN
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// --- Load .env.local manually (avoids dotenv dep) ---
function loadEnv() {
  try {
    const path = resolve(process.cwd(), ".env.local");
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.warn("Could not read .env.local — assuming env vars already set");
  }
}

loadEnv();

// --- Dynamic imports so env is loaded first ---
async function main() {
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { fullSyncFromCompanyCam } = await import("../src/lib/companycam/sync");

  const token = process.env.COMPANYCAM_API_TOKEN;
  if (!token) {
    console.error("COMPANYCAM_API_TOKEN is not set");
    process.exit(1);
  }

  const supabase = createAdminClient();

  const result = await fullSyncFromCompanyCam(supabase, token, (msg) => {
    console.log(msg);
  });

  console.log("\n=== Summary ===");
  console.log(`Projects imported:  ${result.projectsImported}`);
  console.log(`Projects skipped:   ${result.projectsSkipped}`);
  console.log(`Photos imported:    ${result.photosImported}`);
  console.log(`Photos skipped:     ${result.photosSkipped}`);
  console.log(`Errors:             ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log("\nFirst 10 errors:");
    for (const err of result.errors.slice(0, 10)) {
      console.log(`  - ${err}`);
    }
  }

  process.exit(result.errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
