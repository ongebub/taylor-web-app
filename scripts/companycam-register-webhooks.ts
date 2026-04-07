/**
 * Register CompanyCam webhook subscription.
 *
 * Usage:
 *   npx ts-node scripts/companycam-register-webhooks.ts
 *
 * Requires in .env.local:
 *   COMPANYCAM_API_TOKEN
 *   NEXT_PUBLIC_APP_URL   (e.g. https://taylor-web-app.vercel.app)
 *
 * Registers a SINGLE webhook covering all four events:
 *   project.created, project.updated, photo.created, photo.deleted
 *
 * After running, copy the "secret" from the logged response into
 * COMPANYCAM_WEBHOOK_SECRET in .env.local AND your Vercel env vars.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

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

async function main() {
  const { registerWebhookSubscription } = await import(
    "../src/lib/companycam/webhooks"
  );

  const token = process.env.COMPANYCAM_API_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!token) {
    console.error("❌ COMPANYCAM_API_TOKEN is not set in .env.local");
    process.exit(1);
  }
  if (!appUrl) {
    console.error("❌ NEXT_PUBLIC_APP_URL is not set in .env.local");
    console.error(
      "   Set it to your production URL, e.g. https://taylor-web-app.vercel.app"
    );
    process.exit(1);
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/companycam`;
  console.log(`\nRegistering CompanyCam webhook:`);
  console.log(`  URL:    ${webhookUrl}`);
  console.log(`  Events: project.created, project.updated, photo.created, photo.deleted\n`);

  const result = await registerWebhookSubscription(token, webhookUrl);

  console.log("=== Full response ===");
  console.log(JSON.stringify(result, null, 2));
  console.log("=====================\n");

  if (!result.ok) {
    console.error(`❌ Registration failed (HTTP ${result.status})`);
    if (result.error) console.error(`   ${result.error}`);
    process.exit(1);
  }

  console.log("✅ Webhook registered successfully");
  if (result.id) console.log(`   Webhook ID: ${result.id}`);

  if (result.secret) {
    console.log("\n┌─────────────────────────────────────────────────────────┐");
    console.log("│  COPY THIS SECRET INTO .env.local AND VERCEL ENV VARS:  │");
    console.log("└─────────────────────────────────────────────────────────┘");
    console.log(`\nCOMPANYCAM_WEBHOOK_SECRET=${result.secret}\n`);
  } else {
    console.warn(
      "⚠️  No secret field found in the response. Check the full JSON above"
    );
    console.warn("    for the correct field name and update webhooks.ts if needed.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
