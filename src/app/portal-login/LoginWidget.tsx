"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMPANY_PHONE } from "@/lib/config";

type Match = {
  id: string;
  slug: string | null;
  customer_name: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export default function LoginWidget({ embed = false }: { embed?: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  const [lastName, setLastName] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMatches(null);

    const cleanLast = lastName.trim();
    const cleanZip = zip.trim();
    if (!cleanLast || !cleanZip) {
      setError("Please enter both your last name and zip code.");
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("projects")
      .select("id, slug, customer_name, street_address, city, state, zip")
      .ilike("customer_name", `%${cleanLast}%`)
      .eq("zip", cleanZip);

    setLoading(false);

    if (queryError) {
      setError("Something went wrong on our end. Please try again.");
      return;
    }

    const rows = (data ?? []) as Match[];

    if (rows.length === 0) {
      setError(
        `We couldn't find your project. Call us at ${COMPANY_PHONE} and we'll help you out.`
      );
      return;
    }

    if (rows.length === 1 && rows[0].slug) {
      router.push(`/project/${rows[0].slug}`);
      return;
    }

    setMatches(rows);
  }

  const cardClass = embed
    ? "bg-white rounded-xl p-5"
    : "bg-white rounded-2xl shadow-md border border-gray-100 p-6 sm:p-8";

  return (
    <div className={cardClass}>
      {!embed && (
        <h1 className="text-xl sm:text-2xl font-bold text-navy mb-1">
          Find Your Project
        </h1>
      )}
      <p className="text-sm text-gray-500 mb-5">
        Enter your last name and zip code to view your project portal.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
            Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition"
            placeholder="Smith"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
            Zip Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            autoComplete="postal-code"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition"
            placeholder="50309"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange hover:bg-orange/90 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition"
        >
          {loading ? "Looking…" : "View My Project"}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {matches && matches.length > 1 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-navy mb-2">
            We found a few projects — pick yours:
          </p>
          <ul className="space-y-2">
            {matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() =>
                    m.slug ? router.push(`/project/${m.slug}`) : null
                  }
                  className="w-full text-left bg-gray-50 hover:bg-orange/5 border border-gray-200 hover:border-orange/40 rounded-lg px-4 py-3 transition"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {m.customer_name || "Project"}
                  </div>
                  {(m.street_address || m.city) && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {[m.street_address, m.city, m.state, m.zip]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
