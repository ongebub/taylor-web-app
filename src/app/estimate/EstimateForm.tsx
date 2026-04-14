"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const SERVICES = [
  "Roofing",
  "Siding",
  "Windows & Doors",
  "Decking",
  "Storm Damage",
  "Other",
];

type FormState = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  service: string;
  message: string;
};

const emptyForm: FormState = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  address: "",
  service: SERVICES[0],
  message: "",
};

export default function EstimateForm() {
  const params = useSearchParams();
  const [referralId, setReferralId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = params.get("ref");
    if (ref) setReferralId(ref);
  }, [params]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!form.phone.trim()) {
      setError("A phone number is required so we can reach you.");
      return;
    }
    if (!form.email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source: referralId ? "referral" : "estimate",
          referral_id: referralId,
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
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-navy mb-2">We got it!</h2>
        <p className="text-gray-600">
          Expect a call within 1 business day.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          In a hurry?{" "}
          <a
            href="tel:5159534000"
            className="text-orange font-semibold hover:underline"
          >
            Call or text 515-953-4000
          </a>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 sm:p-8 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First Name" required>
          <input
            type="text"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            className={inputClass}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last Name" required>
          <input
            type="text"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            className={inputClass}
            autoComplete="family-name"
          />
        </Field>
        <Field label="Phone" required>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
            autoComplete="tel"
            placeholder="(515) 555-1234"
          />
        </Field>
        <Field label="Email" required>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </Field>
      </div>

      <Field label="Address">
        <input
          type="text"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          className={inputClass}
          autoComplete="street-address"
          placeholder="123 Main St, Des Moines, IA"
        />
      </Field>

      <Field label="Service Needed">
        <select
          value={form.service}
          onChange={(e) => update("service", e.target.value)}
          className={inputClass}
        >
          {SERVICES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Message / Notes">
        <textarea
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="Tell us a bit about the project — timing, damage, whatever's on your mind."
        />
      </Field>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {referralId && (
        <p className="text-xs text-gray-400">
          Referred by a friend — we&apos;ll make sure they know you reached out.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-orange hover:bg-orange/90 disabled:opacity-60 text-white font-bold text-base py-3.5 rounded-xl transition shadow-sm"
      >
        {submitting ? "Sending…" : "Get My Free Estimate"}
      </button>

      <p className="text-xs text-center text-gray-400">
        No pressure, no spam. We&apos;ll call within 1 business day.
      </p>
    </form>
  );
}

const inputClass =
  "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
        {label}
        {required && <span className="text-orange ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
