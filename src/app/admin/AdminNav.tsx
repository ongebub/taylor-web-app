"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminNav() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <nav className="bg-navy shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Image
            src="https://static.wixstatic.com/media/c8f2dc_45dae5be2cab45c1a964279915378377~mv2.png"
            alt="Taylor Exteriors & Construction"
            width={160}
            height={50}
            priority
          />
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
