"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/auth/client";

export function UserNav() {
  const [name, setName] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !user.is_anonymous) {
        setName(user.user_metadata?.full_name ?? user.email ?? "Gracz");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    setName(null);
  }

  if (name) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-zinc-400 truncate max-w-[140px]">{name}</span>
        <button
          onClick={handleLogout}
          className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
        >
          Wyloguj
        </button>
      </div>
    );
  }

  return (
    <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
      Zaloguj się
    </Link>
  );
}
