"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const links = [
    { href: "/admin/projects", label: "Projects" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <nav className="bg-navy shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Image
              src="https://static.wixstatic.com/media/c8f2dc_45dae5be2cab45c1a964279915378377~mv2.png"
              alt="Taylor Exteriors & Construction"
              width={160}
              height={50}
              priority
            />
            <div className="hidden sm:flex items-center gap-1">
              {links.map((link) => {
                const active = pathname?.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-gray-300 hover:text-white text-sm font-medium transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
