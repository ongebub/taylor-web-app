import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registerWebhookSubscription } from "@/lib/companycam/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // Auth check — only logged-in admins can register webhooks
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.COMPANYCAM_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "COMPANYCAM_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_APP_URL not configured" },
      { status: 500 }
    );
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/companycam`;
  const result = await registerWebhookSubscription(token, webhookUrl);

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
