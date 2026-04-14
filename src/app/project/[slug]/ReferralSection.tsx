"use client";

import { useState } from "react";

type Entry = { email: string; name: string };

const INITIAL_ROWS = 5;
const MAX_ROWS = 10;

function emptyRows(n: number): Entry[] {
  return Array.from({ length: n }, () => ({ email: "", name: "" }));
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

export default function ReferralSection({
  projectId,
  referrerName,
}: {
  projectId: string;
  referrerName: string;
}) {
  const [rows, setRows] = useState<Entry[]>(emptyRows(INITIAL_ROWS));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(i: number, field: keyof Entry, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function addFiveMore() {
    setRows((prev) => [
      ...prev,
      ...emptyRows(Math.min(5, MAX_ROWS - prev.length)),
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const referrals = rows
      .map((r) => ({ email: r.email.trim(), name: r.name.trim() }))
      .filter((r) => r.email.length > 0);

    if (referrals.length === 0) {
      setError("Please enter at least one email address.");
      return;
    }

    const bad = referrals.find((r) => !isValidEmail(r.email));
    if (bad) {
      setError(`"${bad.email}" doesn't look like a valid email.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          referrer_name: referrerName,
          referrals,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6 text-center">
        <svg
          className="h-10 w-10 text-green-500 mx-auto mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-base font-bold text-navy mb-1">
          Referrals sent!
        </h3>
        <p className="text-sm text-gray-500">
          We&apos;ll reach out to your friends. Thank you for spreading the word.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-navy mb-1">
        Give the gift of a great contractor!
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        For every referral that signs a contract over $5,000 we&apos;ll send
        you a $100 Amazon gift card.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <input
              type="email"
              value={row.email}
              onChange={(e) => updateRow(i, "email", e.target.value)}
              placeholder="friend@example.com"
              className="sm:col-span-3 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition"
            />
            <input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(i, "name", e.target.value)}
              placeholder="Name (optional)"
              className="sm:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition"
            />
          </div>
        ))}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {rows.length < MAX_ROWS && (
            <button
              type="button"
              onClick={addFiveMore}
              className="text-sm font-medium text-navy hover:text-navy/70 transition"
            >
              + Add 5 more
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="ml-auto bg-orange hover:bg-orange/90 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
          >
            {submitting ? "Sending…" : "Send Referrals"}
          </button>
        </div>
      </form>
    </div>
  );
}
