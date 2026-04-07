import { createAdminClient } from "@/lib/supabase/admin";
import { checkToken } from "@/lib/companycam/client";
import CompanyCamPanel from "./CompanyCamPanel";

export const dynamic = "force-dynamic";

async function getCompanyCamStats() {
  const token = process.env.COMPANYCAM_API_TOKEN;
  const tokenConfigured = !!token;
  const connected = tokenConfigured ? await checkToken(token!) : false;

  const admin = createAdminClient();
  const { count: projectCount } = await admin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .not("companycam_id", "is", null);

  const { count: photoCount } = await admin
    .from("photos")
    .select("id", { count: "exact", head: true })
    .not("companycam_photo_id", "is", null);

  const { data: lastProject } = await admin
    .from("projects")
    .select("created_at")
    .not("companycam_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    tokenConfigured,
    connected,
    projectCount: projectCount || 0,
    photoCount: photoCount || 0,
    lastImportedAt: lastProject?.created_at || null,
  };
}

export default async function SettingsPage() {
  const stats = await getCompanyCamStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Integrations and system configuration
        </p>
      </div>

      <CompanyCamPanel
        tokenConfigured={stats.tokenConfigured}
        initialConnected={stats.connected}
        projectCount={stats.projectCount}
        photoCount={stats.photoCount}
        lastImportedAt={stats.lastImportedAt}
      />
    </div>
  );
}
