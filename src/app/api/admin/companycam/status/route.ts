import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkToken } from "@/lib/companycam/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.COMPANYCAM_API_TOKEN;
  if (!token) {
    return NextResponse.json({ connected: false, reason: "no_token" });
  }

  const connected = await checkToken(token);
  return NextResponse.json({ connected });
}
