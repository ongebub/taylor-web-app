import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  service: string | null;
  message: string | null;
  source: string | null;
  referral_id: string | null;
  created_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  const leads = (data as Lead[] | null) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every submission from the estimate form lands here.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error.message}
        </div>
      )}

      {leads.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-sm text-gray-400">
          No leads yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="text-sm">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">
                      {lead.first_name} {lead.last_name}
                    </div>
                    {lead.address && (
                      <div className="text-xs text-gray-400">
                        {lead.address}
                      </div>
                    )}
                    {lead.message && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-md">
                        &ldquo;{lead.message}&rdquo;
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <a
                      href={`tel:${lead.phone.replace(/\D/g, "")}`}
                      className="text-orange hover:text-orange/80 transition"
                    >
                      {lead.phone}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="hover:text-orange transition"
                      >
                        {lead.email}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-700">
                    {lead.service || (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {lead.source === "referral" ? (
                      <span className="inline-flex items-center gap-1 bg-orange/10 text-orange text-xs font-semibold px-2.5 py-1 rounded-full">
                        Referral
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 capitalize">
                        {lead.source || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(lead.created_at)}
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
