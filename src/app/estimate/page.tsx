import { Suspense } from "react";
import Image from "next/image";
import EstimateForm from "./EstimateForm";
import { COMPANY_PHONE, COMPANY_EMAIL } from "@/lib/config";

export const metadata = {
  title: "Get Your Free Estimate | Taylor Exteriors & Construction",
  description:
    "Des Moines' choice for premium exterior protection. Roofing, siding, windows, decking, and storm damage repair. Built to last. Backed by honesty.",
};

export default function EstimatePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-navy relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-orange" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <Image
            src="https://static.wixstatic.com/media/c8f2dc_45dae5be2cab45c1a964279915378377~mv2.png"
            alt="Taylor Exteriors & Construction"
            width={200}
            height={62}
            className="h-12 w-auto"
            priority
          />
          <a
            href={`tel:${COMPANY_PHONE.replace(/\D/g, "")}`}
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-orange transition"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.49a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z"
              />
            </svg>
            {COMPANY_PHONE}
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-navy text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12 pt-4 text-center">
          <p className="text-xs font-semibold text-orange uppercase tracking-[0.2em] mb-3">
            Built to Last. Backed by Honesty.
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 leading-tight">
            Get Your Free Estimate
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto">
            Des Moines&rsquo; choice for premium exterior protection.
          </p>
        </div>
      </section>

      {/* Form */}
      <main className="flex-1 -mt-8 pb-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <Suspense
            fallback={
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 text-center text-gray-400">
                Loading…
              </div>
            }
          >
            <EstimateForm />
          </Suspense>

          {/* Trust row */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <Stat label="Local" value="Des Moines" />
            <Stat label="Response" value="< 1 day" />
            <Stat label="Warranty" value="Backed" />
          </div>
        </div>
      </main>

      <footer className="bg-navy text-white/70 py-8 px-4 text-center text-sm space-y-1">
        <p className="font-semibold text-white">
          Taylor Exteriors &amp; Construction
        </p>
        <p>Des Moines, Iowa</p>
        <p>
          <a
            href={`tel:${COMPANY_PHONE.replace(/\D/g, "")}`}
            className="hover:text-orange transition"
          >
            {COMPANY_PHONE}
          </a>
          {" · "}
          <a
            href={`mailto:${COMPANY_EMAIL}`}
            className="hover:text-orange transition"
          >
            {COMPANY_EMAIL}
          </a>
        </p>
        <p className="text-xs text-white/50 italic pt-2">
          &ldquo;Built to Last. Backed by Honesty.&rdquo;
        </p>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-3 shadow-sm">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-bold text-navy mt-0.5">{value}</p>
    </div>
  );
}
