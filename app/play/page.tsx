"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureGuestSession } from "@/lib/auth/guest";

interface Tag {
  id: string;
  name: string;
  color: string;
}

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_OPTIONS: { value: Difficulty | "all"; label: string }[] = [
  { value: "all", label: "Wszystkie" },
  { value: "easy", label: "Łatwe" },
  { value: "medium", label: "Średnie" },
  { value: "hard", label: "Trudne" },
];

export default function PlayPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/tags")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setTags(data))
      .catch(() => {});
  }, []);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function startGame() {
    setLoading(true);
    setError(null);
    try {
      await ensureGuestSession();

      const body: Record<string, unknown> = {};
      if (difficulty !== "all") body.filterDifficulty = difficulty;
      if (selectedTagIds.length > 0) body.filterTagIds = selectedTagIds;

      const res = await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
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

      {/* Filters */}
      <div className="w-full max-w-sm space-y-4">
        {/* Difficulty */}
        <div>
          <div className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">Trudność</div>
          <div className="flex gap-2 flex-wrap">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  difficulty === opt.value
                    ? "bg-white text-zinc-900 border-white"
                    : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags (only if any exist) */}
        {tags.length > 0 && (
          <div>
            <div className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">
              Tagi (opcjonalnie)
            </div>
            <div className="flex gap-2 flex-wrap">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-opacity ${
                    selectedTagIds.includes(tag.id) ? "opacity-100" : "opacity-40"
                  }`}
                  style={{
                    background: tag.color + "22",
                    color: tag.color,
                    borderColor: tag.color,
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            {selectedTagIds.length > 0 && (
              <button
                onClick={() => setSelectedTagIds([])}
                className="text-xs text-zinc-600 hover:text-zinc-400 mt-1 transition-colors"
              >
                Wyczyść tagi
              </button>
            )}
          </div>
        )}
      </div>

      <button
        onClick={startGame}
        disabled={loading}
        className="px-10 py-4 bg-white text-zinc-900 rounded-2xl font-bold text-lg hover:bg-zinc-100 transition-colors disabled:opacity-50"
      >
        {loading ? "Przygotowuję grę…" : "Zagraj"}
      </button>

      {error && (
        <p className="text-red-400 text-sm bg-red-950/50 px-4 py-2 rounded-lg max-w-sm text-center">
          {error}
        </p>
      )}
    </main>
  );
}
