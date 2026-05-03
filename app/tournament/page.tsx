"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Filter, Loader2, Sparkles, Users } from "lucide-react";
import { ensureGuestSession } from "@/lib/auth/guest";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Logo } from "@/components/brand/Logo";
import {
  TOURNAMENT_DISPLAY_NAME_MAX,
  TOURNAMENT_DISPLAY_NAME_MIN,
  isValidTournamentCode,
  normalizeTournamentCode,
} from "@/lib/tournaments";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "medium" | "hard" | "extreme";
type Mode = "create" | "join";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Łatwe" },
  { value: "medium", label: "Średnie" },
  { value: "hard", label: "Trudne" },
  { value: "extreme", label: "Ekstremalne" },
];

const DEFAULT_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export default function TournamentLandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");

  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [difficulties, setDifficulties] = useState<Difficulty[]>(DEFAULT_DIFFICULTIES);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const name = data?.displayName as string | null | undefined;
        if (name) {
          setDisplayName((prev) => (prev.trim().length === 0 ? name : prev));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function validateName(): string | null {
    const trimmed = displayName.trim();
    if (
      trimmed.length < TOURNAMENT_DISPLAY_NAME_MIN ||
      trimmed.length > TOURNAMENT_DISPLAY_NAME_MAX
    ) {
      return `Nick musi mieć od ${TOURNAMENT_DISPLAY_NAME_MIN} do ${TOURNAMENT_DISPLAY_NAME_MAX} znaków`;
    }
    return null;
  }

  async function handleCreate() {
    const nameErr = validateName();
    if (nameErr) {
      setError(nameErr);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await ensureGuestSession();
      const body: Record<string, unknown> = { displayName: displayName.trim(), filterDifficulties: difficulties };

      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() ?? `HTTP ${res.status}`);

      router.push(`/tournament/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się utworzyć turnieju");
      setSubmitting(false);
    }
  }

  async function handleJoin() {
    const nameErr = validateName();
    if (nameErr) {
      setError(nameErr);
      return;
    }
    const normalized = normalizeTournamentCode(code);
    if (!isValidTournamentCode(normalized)) {
      setError("Nieprawidłowy kod turnieju");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await ensureGuestSession();
      const res = await fetch(`/api/tournaments/${normalized}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString() ?? `HTTP ${res.status}`);

      router.push(`/tournament/${normalized}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się dołączyć");
      setSubmitting(false);
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
              <Sparkles className="size-3 text-brand" />
              Turniej · do 20 graczy
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Zagraj ze znajomymi
            </h1>
            <p className="text-muted-foreground">
              Utwórz turniej i podziel się kodem albo dołącz do istniejącego.
            </p>
          </div>

          <div className="flex gap-1 rounded-full border bg-card/40 p-1 w-full">
            <button
              onClick={() => {
                setMode("create");
                setError(null);
              }}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "create"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Utwórz
            </button>
            <button
              onClick={() => {
                setMode("join");
                setError(null);
              }}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "join"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Dołącz
            </button>
          </div>

          <Card className="w-full bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                Twoje dane
              </CardTitle>
              <CardDescription>
                Pod tą nazwą zobaczą Cię inni gracze.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="tournament-nick">Nick</Label>
                <Input
                  id="tournament-nick"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={TOURNAMENT_DISPLAY_NAME_MAX}
                  placeholder="Np. Kasia"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {displayName.trim().length}/{TOURNAMENT_DISPLAY_NAME_MAX} znaków
                </p>
              </div>
            </CardContent>
          </Card>

          {mode === "create" ? (
            <Card className="w-full bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="size-4 text-muted-foreground" />
                  Filtry
                </CardTitle>
                <CardDescription>Zostaną zastosowane do losowania zdjęć.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
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
          ) : (
            <Card className="w-full bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Kod turnieju</CardTitle>
                <CardDescription>6 znaków od hosta.</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  maxLength={6}
                  placeholder="ABC234"
                  className="text-center text-2xl tracking-[0.4em] font-bold tabular-nums uppercase"
                  autoComplete="off"
                  autoCapitalize="characters"
                />
              </CardContent>
            </Card>
          )}

          <Button
            onClick={mode === "create" ? handleCreate : handleJoin}
            disabled={submitting}
            size="xl"
            variant="brand"
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" />
                {mode === "create" ? "Tworzę turniej…" : "Dołączam…"}
              </>
            ) : (
              <>
                {mode === "create" ? "Utwórz turniej" : "Dołącz do turnieju"}
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
