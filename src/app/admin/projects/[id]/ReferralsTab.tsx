"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ReferralsTable, {
  type ReferralRow,
} from "../../referrals/ReferralsTable";

export default function ReferralsTab({ projectId }: { projectId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<ReferralRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data as ReferralRow[]) || []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, supabase]);

  if (rows === null) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
        Loading referrals...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}
      <ReferralsTable initialRows={rows} showProjectColumn={false} />
    </div>
  );
}
