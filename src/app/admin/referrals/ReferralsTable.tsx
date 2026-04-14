"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export type ReferralRow = {
  id: string;
  project_id: string | null;
  referrer_name: string;
  referrer_email: string | null;
  referred_email: string;
  referred_name: string | null;
  email_sent_at: string | null;
  signed_contract: boolean;
  contract_value: number | null;
  gift_card_sent: boolean;
  gift_card_sent_at: string | null;
  created_at: string;
  project?: {
    id: string;
    customer_name: string | null;
    slug: string | null;
  } | null;
};

type Filter = "all" | "pending" | "signed" | "gift_card_sent";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function ReferralsTable({
  initialRows,
  showProjectColumn = true,
}: {
  initialRows: ReferralRow[];
  showProjectColumn?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<ReferralRow[]>(initialRows);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "pending") return !r.signed_contract && !r.gift_card_sent;
    if (filter === "signed") return r.signed_contract;
    if (filter === "gift_card_sent") return r.gift_card_sent;
    return true;
  });

  async function markSigned(row: ReferralRow) {
    const raw = window.prompt(
      "Enter the signed contract value (USD):",
      row.contract_value ? String(row.contract_value) : ""
    );
    if (raw == null) return;
    const value = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Please enter a valid dollar amount.");
      return;
    }
    setBusyId(row.id);
    setError(null);
    const { error: updateError } = await supabase
      .from("referrals")
      .update({ signed_contract: true, contract_value: value })
      .eq("id", row.id);
    if (updateError) {
      setError(updateError.message);
    } else {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, signed_contract: true, contract_value: value }
            : r
        )
      );
    }
    setBusyId(null);
  }

  async function markGiftCard(row: ReferralRow) {
    setBusyId(row.id);
    setError(null);
    const sentAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("referrals")
      .update({ gift_card_sent: true, gift_card_sent_at: sentAt })
      .eq("id", row.id);
    if (updateError) {
      setError(updateError.message);
    } else {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, gift_card_sent: true, gift_card_sent_at: sentAt }
            : r
        )
      );
    }
    setBusyId(null);
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: rows.length },
    {
      key: "pending",
      label: "Pending",
      count: rows.filter(
        (r) => !r.signed_contract && !r.gift_card_sent
      ).length,
    },
    {
      key: "signed",
      label: "Signed",
      count: rows.filter((r) => r.signed_contract).length,
    },
    {
      key: "gift_card_sent",
      label: "Gift Card Sent",
      count: rows.filter((r) => r.gift_card_sent).length,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === f.key
                ? "bg-navy text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-sm text-gray-400">
          No referrals match this filter.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Referrer</th>
                <th className="px-5 py-3">Referred</th>
                {showProjectColumn && <th className="px-5 py-3">Project</th>}
                <th className="px-5 py-3">Sent</th>
                <th className="px-5 py-3">Contract</th>
                <th className="px-5 py-3">Gift Card</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="text-sm">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">
                      {r.referrer_name}
                    </div>
                    {r.referrer_email && (
                      <div className="text-xs text-gray-400">
                        {r.referrer_email}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-gray-900">{r.referred_email}</div>
                    {r.referred_name && (
                      <div className="text-xs text-gray-400">
                        {r.referred_name}
                      </div>
                    )}
                  </td>
                  {showProjectColumn && (
                    <td className="px-5 py-3 text-gray-600">
                      {r.project?.id ? (
                        <Link
                          href={`/admin/projects/${r.project.id}`}
                          className="text-navy hover:text-orange transition"
                        >
                          {r.project.customer_name || r.project.slug || "—"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {formatDate(r.email_sent_at ?? r.created_at)}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {r.signed_contract ? (
                      <span className="text-green-700 font-medium">
                        {formatCurrency(r.contract_value)}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not signed</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {r.gift_card_sent ? (
                      <span className="text-green-700 font-medium">
                        Sent {formatDate(r.gift_card_sent_at)}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not sent</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap space-x-3">
                    {!r.signed_contract && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => markSigned(r)}
                        className="text-xs font-semibold text-orange hover:text-orange/80 disabled:opacity-50 transition"
                      >
                        Mark Signed
                      </button>
                    )}
                    {r.signed_contract && !r.gift_card_sent && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => markGiftCard(r)}
                        className="text-xs font-semibold text-navy hover:text-navy/70 disabled:opacity-50 transition"
                      >
                        Mark Gift Card Sent
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
