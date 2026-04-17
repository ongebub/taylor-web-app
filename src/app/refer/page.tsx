"use client";

import { useState } from "react";
import Image from "next/image";

const LOGO_URL =
  "https://static.wixstatic.com/media/c8f2dc_45dae5be2cab45c1a964279915378377~mv2.png";

interface ReferralRow {
  name: string;
  email: string;
  phone: string;
}

const emptyRow = (): ReferralRow => ({ name: "", email: "", phone: "" });

export default function ReferPage() {
  const [referrerName, setReferrerName] = useState("");
  const [referrerEmail, setReferrerEmail] = useState("");
  const [rows, setRows] = useState<ReferralRow[]>([
    emptyRow(),
    emptyRow(),
    emptyRow(),
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function updateRow(index: number, field: keyof ReferralRow, value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function addRow() {
    if (rows.length >= 10) return;
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!referrerName.trim() || !referrerEmail.trim()) {
      setError("Please fill in your name and email.");
      return;
    }

    const validRows = rows.filter((r) => r.email.trim());
    if (validRows.length === 0) {
      setError("Please enter at least one referral email.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/referrals/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referrer_name: referrerName.trim(),
          referrer_email: referrerEmail.trim(),
          referrals: validRows.map((r) => ({
            email: r.email.trim(),
            name: r.name.trim() || null,
            phone: r.phone.trim() || null,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Something went wrong");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <Image
            src={LOGO_URL}
            alt="Taylor Exteriors & Construction"
            width={220}
            height={80}
            priority
            className="mx-auto mb-8"
          />
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              You&apos;re all set!
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We&apos;ll reach out to your referrals and let you know when gift cards
              are on the way.
            </p>
            <p className="text-gray-400 mt-4 text-sm">
              Questions? Call or text{" "}
              <a href="tel:5159534000" className="text-[#cc0000] font-semibold hover:underline">
                515-953-4000
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-5 flex justify-center">
          <Image
            src={LOGO_URL}
            alt="Taylor Exteriors & Construction"
            width={200}
            height={70}
            priority
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Refer a Friend.{" "}
            <span className="text-[#cc0000]">Earn a $100 Gift Card.</span>
          </h1>
          <div className="w-20 h-1 bg-[#cc0000] mx-auto mb-6" />
          <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
            Know someone who needs roofing, siding, windows, or decking? Send
            them our way. For every referral that signs a contract of $10,000 or
            more, we&apos;ll send you a <strong className="text-white">$100 Amazon or Visa gift card</strong>.
          </p>
        </div>

        {/* How It Works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-14">
          {[
            {
              step: "1",
              icon: (
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
              ),
              title: "Fill out the form below",
            },
            {
              step: "2",
              icon: (
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              ),
              title: "We reach out to your referrals",
            },
            {
              step: "3",
              icon: (
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              ),
              title: "You get a $100 gift card for every $10k in closed work",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white/5 border border-white/10 rounded-xl p-6 text-center"
            >
              <div className="w-14 h-14 bg-[#cc0000] rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                {item.icon}
              </div>
              <div className="text-xs font-bold text-[#cc0000] uppercase tracking-widest mb-2">
                Step {item.step}
              </div>
              <p className="text-sm font-medium text-gray-200">{item.title}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-200 rounded-lg px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          {/* Referrer Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#cc0000] rounded-full flex items-center justify-center text-xs font-bold">1</span>
              Your Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Your Name <span className="text-[#cc0000]">*</span>
                </label>
                <input
                  type="text"
                  value={referrerName}
                  onChange={(e) => setReferrerName(e.target.value)}
                  required
                  placeholder="John Smith"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#cc0000] focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Your Email <span className="text-[#cc0000]">*</span>
                </label>
                <input
                  type="email"
                  value={referrerEmail}
                  onChange={(e) => setReferrerEmail(e.target.value)}
                  required
                  placeholder="john@email.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#cc0000] focus:border-transparent transition"
                />
              </div>
            </div>
          </div>

          {/* Referrals */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#cc0000] rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Who are you referring?
            </h2>
            <div className="space-y-4">
              {rows.map((row, i) => (
                <div key={i} className="relative">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white text-xs transition z-10"
                      title="Remove"
                    >
                      &times;
                    </button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/5 border border-white/10 rounded-lg p-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(i, "name", e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#cc0000] focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Email <span className="text-[#cc0000]">*</span>
                      </label>
                      <input
                        type="email"
                        value={row.email}
                        onChange={(e) => updateRow(i, "email", e.target.value)}
                        placeholder="jane@email.com"
                        className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#cc0000] focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={row.phone}
                        onChange={(e) => updateRow(i, "phone", e.target.value)}
                        placeholder="(515) 555-1234"
                        className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#cc0000] focus:border-transparent transition"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {rows.length < 10 && (
              <button
                type="button"
                onClick={addRow}
                className="mt-4 text-sm font-semibold text-[#cc0000] hover:text-[#aa0000] transition"
              >
                + Add More
              </button>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#cc0000] hover:bg-[#aa0000] text-white font-bold py-4 rounded-xl text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending..." : "Submit Referrals"}
          </button>
        </form>

        {/* Fine Print */}
        <p className="text-center text-xs text-gray-500 mt-8 max-w-2xl mx-auto leading-relaxed">
          Gift card issued after referred customer signs a contract for work
          totaling $10,000 or more and project is complete. One gift card per
          qualifying referral. No limit on referrals.
        </p>
      </div>
    </div>
  );
}
