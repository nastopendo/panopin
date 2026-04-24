"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ensureGuestSession } from "@/lib/auth/guest";

export default function PlayPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function startGame() {
    setLoading(true);
    setError(null);
    try {
      await ensureGuestSession();

      const res = await fetch("/api/rounds", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { roundId } = await res.json();
      router.push(`/play/${roundId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nieznany błąd");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-zinc-950 text-white p-8">
      <div className="text-center space-y-3 max-w-md">
        <h1 className="text-4xl font-bold tracking-tight">Panopin</h1>
        <p className="text-zinc-400">
          Obejrzyj panoramę 360° i wskaż na mapie, gdzie została zrobiona.
          5 lokalizacji, im bliżej — tym więcej punktów.
        </p>
      </div>

      <button
        onClick={startGame}
        disabled={loading}
        className="px-10 py-4 bg-white text-zinc-900 rounded-2xl font-bold text-lg hover:bg-zinc-100 transition-colors disabled:opacity-50"
      >
        {loading ? "Przygotowuję grę…" : "Zagraj"}
      </button>

      {error && (
        <p className="text-red-400 text-sm bg-red-950/50 px-4 py-2 rounded-lg">{error}</p>
      )}
    </main>
  );
}
