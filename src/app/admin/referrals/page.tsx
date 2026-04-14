import { createClient } from "@/lib/supabase/server";
import ReferralsTable, { type ReferralRow } from "./ReferralsTable";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("referrals")
    .select(
      `
      id,
      project_id,
      referrer_name,
      referrer_email,
      referred_email,
      referred_name,
      email_sent_at,
      signed_contract,
      contract_value,
      gift_card_sent,
      gift_card_sent_at,
      created_at,
      project:projects ( id, customer_name, slug )
    `
    )
    .order("created_at", { ascending: false });

  const rows: ReferralRow[] = ((data as unknown) as ReferralRow[]) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Referrals</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track referrals sent from completed projects. Mark signed contracts
          and gift-card fulfillment here.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error.message}
        </div>
      )}

      <ReferralsTable initialRows={rows} showProjectColumn />
    </div>
  );
}
