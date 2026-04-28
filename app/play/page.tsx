"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Filter, Loader2, Sparkles } from "lucide-react";
import { ensureGuestSession } from "@/lib/auth/guest";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

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
  const [tagsLoading, setTagsLoading] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/tags")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTags(data);
      })
      .catch(() => {})
      .finally(() => setTagsLoading(false));
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
    <main className="bg-aurora min-h-dvh flex flex-col">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between">
        <Logo size="md" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Strona główna</span>
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="size-3 text-brand" />5 lokalizacji · jedna runda
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Gotów do gry?
            </h1>
            <p className="text-muted-foreground">
              Wybierz trudność i opcjonalne tagi — albo zostaw wszystko i zaczynaj.
            </p>
          </div>

          <Card className="w-full bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                Filtry
              </CardTitle>
              <CardDescription>Zostaną zastosowane do losowania.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Trudność
                </p>
                <ToggleGroup
                  type="single"
                  value={difficulty}
                  onValueChange={(v) => v && setDifficulty(v as Difficulty | "all")}
                  className="w-full"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <ToggleGroupItem
                      key={opt.value}
                      value={opt.value}
                      aria-label={opt.label}
                      className="flex-1 min-w-[5rem]"
                    >
                      {opt.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tagi <span className="text-muted-foreground/60 normal-case">(opcjonalnie)</span>
                  </p>
                  {selectedTagIds.length > 0 && (
                    <button
                      onClick={() => setSelectedTagIds([])}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Wyczyść ({selectedTagIds.length})
                    </button>
                  )}
                </div>
                {tagsLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-20 rounded-full" />
                    ))}
                  </div>
                ) : tags.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Brak tagów w bazie.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const active = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          aria-pressed={active}
                          className={cn(
                            "inline-flex items-center h-9 px-3 rounded-full text-xs font-medium border transition-all duration-150",
                            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            active ? "scale-100" : "opacity-60 hover:opacity-100",
                          )}
                          style={{
                            background: active ? tag.color + "33" : "transparent",
                            color: tag.color,
                            borderColor: active ? tag.color : tag.color + "55",
                          }}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={startGame}
            disabled={loading}
            size="xl"
            variant="brand"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Przygotowuję grę…
              </>
            ) : (
              <>
                Zagraj
                <ArrowRight />
              </>
            )}
          </Button>

          {error && (
            <div
              role="alert"
              className="w-full rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
