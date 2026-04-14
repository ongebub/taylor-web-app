import Image from "next/image";
import LoginWidget from "./LoginWidget";
import { COMPANY_PHONE, COMPANY_EMAIL } from "@/lib/config";

export const metadata = {
  title: "Find Your Project | Taylor Exteriors",
};

export default function PortalLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-navy">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <Image
            src="https://static.wixstatic.com/media/c8f2dc_45dae5be2cab45c1a964279915378377~mv2.png"
            alt="Taylor Exteriors & Construction"
            width={180}
            height={56}
            className="h-11 w-auto"
            priority
          />
          <span className="text-xs font-medium text-white/60 uppercase tracking-wider hidden sm:inline">
            Customer Portal
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <LoginWidget />
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-6 px-4">
        <p>Taylor Exteriors &amp; Construction · Des Moines, IA</p>
        <p className="mt-1">
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
      </footer>
    </div>
  );
}
