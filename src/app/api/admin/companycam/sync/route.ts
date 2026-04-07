import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fullSyncFromCompanyCam } from "@/lib/companycam/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function POST() {
  // Auth check — only logged-in admins can trigger sync
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
      { error: "COMPANYCAM_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    const admin = createAdminClient();
    const result = await fullSyncFromCompanyCam(admin, token);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[companycam sync] failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
