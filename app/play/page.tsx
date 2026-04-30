"use client";

import { useState } from "react";
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
import { Logo } from "@/components/brand/Logo";

type Difficulty = "easy" | "medium" | "hard" | "extreme";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Łatwe" },
  { value: "medium", label: "Średnie" },
  { value: "hard", label: "Trudne" },
  { value: "extreme", label: "Ekstremalne" },
];

const DEFAULT_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export default function PlayPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulties, setDifficulties] = useState<Difficulty[]>(DEFAULT_DIFFICULTIES);
  const router = useRouter();

  async function startGame() {
    setLoading(true);
    setError(null);
    try {
      await ensureGuestSession();

      const body: Record<string, unknown> = { filterDifficulties: difficulties };

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
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Trudność
                </p>
                <ToggleGroup
                  type="multiple"
                  value={difficulties}
                  onValueChange={(v) => v.length > 0 && setDifficulties(v as Difficulty[])}
                  className="w-full"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <ToggleGroupItem
                      key={opt.value}
                      value={opt.value}
                      aria-label={opt.label}
                      className="flex-1"
                    >
                      {opt.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
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
