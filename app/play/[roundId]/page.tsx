"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Loader2,
  LogIn,
  Save,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/auth/client";
import type { TileManifest } from "@/components/panorama/Viewer";
import type { GuessResult } from "@/components/map/GuessMap";
import type { ResultsMapPhoto } from "@/components/map/ResultsMap";
import type { MapStyle } from "@/lib/map-styles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const PanoramaViewer = dynamic(() => import("@/components/panorama/Viewer"), {
  ssr: false,
});
const GuessMap = dynamic(() => import("@/components/map/GuessMap"), {
  ssr: false,
});
const ResultsMap = dynamic(() => import("@/components/map/ResultsMap"), {
  ssr: false,
});
const ShareButton = dynamic(
  () =>
    import("@/components/ShareButton").then((m) => ({
      default: m.ShareButton,
    })),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard" | "extreme";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Łatwe",
  medium: "Średnie",
  hard: "Trudne",
  extreme: "Ekstremalne",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "text-green-600 bg-green-950/80 border-green-700/50",
  medium: "text-yellow-400 bg-yellow-950/80 border-yellow-700/50",
  hard: "text-red-400 bg-red-950/80 border-red-700/50",
  extreme: "text-purple-400 bg-purple-950/80 border-purple-700/50",
};

interface RoundPhoto {
  photoId: string;
  tileBaseUrl: string;
  heading: number;
  defaultYaw?: number | null;
  tileLevels: Array<{ faceSize: number; nbTiles: number }>;
  difficulty: Difficulty;
  tags: { id: string; name: string; color: string }[];
}

interface StepResult {
  guessLat: number;
  guessLng: number;
  actualLat: number;
  actualLng: number;
  distanceM: number;
  score: number;
  baseScore: number;
  timeBonus: number;
}

interface MapSettings {
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  mapStyle: MapStyle;
}

type Phase = "loading" | "error" | "playing" | "revealed" | "finished";

interface TournamentPlayerScore {
  id: string;
  userId: string;
  displayName: string;
  currentScore: number;
  finishedAt: string | null;
}

const DEFAULT_MAP_SETTINGS: MapSettings = {
  centerLat: 52.0,
  centerLng: 19.5,
  defaultZoom: 5,
  mapStyle: "street",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function scoreColor(score: number): string {
  if (score >= 4000) return "text-success";
  if (score >= 2000) return "text-warning";
  return "text-destructive";
}

function scoreLabel(score: number): string {
  if (score >= 4500) return "Mistrzowsko";
  if (score >= 4000) return "Świetnie";
  if (score >= 2500) return "Dobrze";
  if (score >= 1000) return "Spróbuj jeszcze";
  return "Pudło";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoundPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const searchParams = useSearchParams();
  const tournamentCode = searchParams.get("tournament");
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [photos, setPhotos] = useState<RoundPhoto[]>([]);
  const [mapSettings, setMapSettings] =
    useState<MapSettings>(DEFAULT_MAP_SETTINGS);
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<StepResult[]>([]);
  const [currentResult, setCurrentResult] = useState<StepResult | null>(null);
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const [topPercent, setTopPercent] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);

  const [tournamentPlayers, setTournamentPlayers] = useState<
    TournamentPlayerScore[]
  >([]);
  const [timeLimitS, setTimeLimitS] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAnonymous(user?.is_anonymous === true);
    });
  }, []);

  const stepStartRef = useRef<number>(0);
  const pendingPinRef = useRef<{ lat: number; lng: number } | null>(null);
  const handleGuessRef = useRef<
    ((guess: { lat: number; lng: number }) => Promise<void>) | null
  >(null);

  // Load tournament state + subscribe to live score updates
  useEffect(() => {
    if (!tournamentCode) return;
    let channel: ReturnType<
      ReturnType<typeof createSupabaseBrowserClient>["channel"]
    > | null = null;

    async function initTournament() {
      const res = await fetch(`/api/tournaments/${tournamentCode}`).catch(
        () => null,
      );
      if (!res?.ok) return;
      const data = await res.json().catch(() => null);
      if (!data) return;

      const supabase = createSupabaseBrowserClient();
      channel = supabase
        .channel(`tournament-play-${data.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tournament_players",
            filter: `tournament_id=eq.${data.id}`,
          },
          async () => {
            const r = await fetch(`/api/tournaments/${tournamentCode}`).catch(
              () => null,
            );
            if (!r?.ok) return;
            const d = await r.json().catch(() => null);
            if (d) setTournamentPlayers(d.players ?? []);
          },
        )
        .subscribe();
      setTournamentPlayers(data.players ?? []);
    }

    initTournament();
    return () => {
      channel?.unsubscribe();
    };
  }, [tournamentCode]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/rounds/${roundId}`).then((r) => r.json()),
      fetch("/api/map-settings").then((r) => r.json()),
      fetch("/api/scoring-settings").then((r) => r.json()),
    ])
      .then(([roundData, settingsData, scoringData]) => {
        if (roundData.error) throw new Error(roundData.error);
        setPhotos(roundData.photos);
        setMapSettings({
          centerLat: settingsData.centerLat ?? DEFAULT_MAP_SETTINGS.centerLat,
          centerLng: settingsData.centerLng ?? DEFAULT_MAP_SETTINGS.centerLng,
          defaultZoom:
            settingsData.defaultZoom ?? DEFAULT_MAP_SETTINGS.defaultZoom,
          mapStyle: settingsData.mapStyle ?? DEFAULT_MAP_SETTINGS.mapStyle,
        });
        const limit = scoringData.timeLimitS ?? 30;
        setTimeLimitS(limit);
        setTimeLeft(limit);
        stepStartRef.current = Date.now();
        setPhase("playing");
      })
      .catch((e) => {
        setErrorMsg(e.message ?? "Nie można wczytać rundy");
        setPhase("error");
      });
  }, [roundId]);

  // Keep handleGuessRef in sync so the timer callback always sees the latest version
  useEffect(() => {
    handleGuessRef.current = handleGuess;
  });

  // Countdown timer — interval only decrements, timeLeft is reset externally (in load/handleNext)
  useEffect(() => {
    if (phase !== "playing" || timeLimitS === 0) return;

    pendingPinRef.current = null;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, step, timeLimitS]);

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timeLeft !== 0 || phase !== "playing" || submitting) return;
    const fallback = { lat: mapSettings.centerLat, lng: mapSettings.centerLng };
    handleGuessRef.current?.(pendingPinRef.current ?? fallback);
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGuess(guess: GuessResult) {
    if (submitting) return;
    setSubmitting(true);

    const elapsedMs = Date.now() - stepStartRef.current;
    const photo = photos[step];

    try {
      const res = await fetch(`/api/rounds/${roundId}/guesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId: photo.photoId,
          sequenceNumber: step + 1,
          guessLat: guess.lat,
          guessLng: guess.lng,
          elapsedMs,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      const result: StepResult = {
        guessLat: guess.lat,
        guessLng: guess.lng,
        actualLat: data.actualLat,
        actualLng: data.actualLng,
        distanceM: data.distanceM,
        score: data.score,
        baseScore: data.baseScore,
        timeBonus: data.timeBonus,
      };

      setCurrentResult(result);
      setResults((prev) => [...prev, result]);
      setPhase("revealed");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Błąd wysyłania odpowiedzi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (step + 1 >= photos.length) {
      try {
        const res = await fetch(`/api/rounds/${roundId}/finish`, {
          method: "POST",
        });
        const data = await res.json();
        if (tournamentCode) {
          router.push(`/tournament/${tournamentCode}`);
          return;
        }
        setTotalScore(data.totalScore);
        setTopPercent(data.topPercent ?? null);
      } catch {
        if (tournamentCode) {
          router.push(`/tournament/${tournamentCode}`);
          return;
        }
        const localTotal =
          results.reduce((s, r) => s + r.score, 0) +
          (currentResult?.score ?? 0);
        setTotalScore(localTotal);
      }
      setPhase("finished");
    } else {
      setStep((s) => s + 1);
      setCurrentResult(null);
      setTimeLeft(timeLimitS);
      setPhase("playing");
      stepStartRef.current = Date.now();
    }
  }

  const currentPhoto = photos[step];
  const tilesManifest: TileManifest | undefined = currentPhoto
    ? {
        photoId: currentPhoto.photoId,
        baseUrl: currentPhoto.tileBaseUrl,
        heading: currentPhoto.heading,
        defaultYaw: currentPhoto.defaultYaw,
        levels: currentPhoto.tileLevels,
      }
    : undefined;

  const runningScore = results.reduce((s, r) => s + r.score, 0);

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="h-dvh flex flex-col bg-background">
        <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between shrink-0">
          <Logo size="md" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Ładowanie rundy…
          </div>
        </div>
        <div className="flex-1 grid md:grid-cols-[3fr_2fr]">
          <Skeleton className="rounded-none" />
          <Skeleton className="rounded-none border-l border-border md:border-t-0 border-t" />
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 p-6 text-center bg-aurora">
        <div className="rounded-full size-12 bg-destructive/15 ring-1 ring-destructive/30 flex items-center justify-center">
          <Target className="size-6 text-destructive" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold">Nie udało się wczytać rundy</h1>
          <p className="text-muted-foreground text-sm max-w-sm">{errorMsg}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft />
              Strona główna
            </Link>
          </Button>
          <Button asChild variant="brand">
            <Link href="/play">Spróbuj ponownie</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ─── Finished ──────────────────────────────────────────────────────────────

  if (phase === "finished") {
    return (
      <div className="min-h-dvh bg-aurora overflow-y-auto">
        <header className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft />
              <span className="hidden sm:inline">Strona główna</span>
            </Link>
          </Button>
        </header>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6">
          <Card className="p-6 sm:p-8 text-center bg-card/60 backdrop-blur-md">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/50 px-3 py-1 text-xs text-muted-foreground mx-auto">
              <Trophy className="size-3 text-brand" />
              Koniec rundy
            </span>
            <div className="mt-4 text-6xl sm:text-7xl font-bold tabular-nums tracking-tight">
              {totalScore?.toLocaleString("pl-PL")}
            </div>
            <p className="mt-1 text-muted-foreground text-sm">
              punktów łącznie
            </p>
            {topPercent !== null && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success ring-1 ring-success/30">
                <Trophy className="size-3" />
                Jesteś w top {topPercent}% graczy
              </div>
            )}
          </Card>

          {isAnonymous && !tournamentCode && (
            <Card className="p-5 bg-gradient-to-br from-brand/10 to-card/60 backdrop-blur-md ring-1 ring-brand/30">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-full bg-brand/15 ring-1 ring-brand/30 flex items-center justify-center shrink-0">
                  <Save className="size-5 text-brand" />
                </div>
                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="space-y-1">
                    <h3 className="font-semibold leading-tight">
                      Zapisz ten wynik na swoim koncie
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Grasz jako gość. Zaloguj się, aby ten wynik został
                      przypisany do Twojego konta i pojawił się w rankingu -
                      dotychczasowe rundy zostaną zachowane.
                    </p>
                  </div>
                  <Button asChild variant="brand" size="sm">
                    <Link href={`/login?redirect=/results/${roundId}`}>
                      <LogIn />
                      Zaloguj się i zachowaj wynik
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-2 overflow-hidden h-[360px] bg-card/60">
            <ResultsMap
              results={results}
              photos={photos}
              onPhotoClick={setSelectedPhotoIdx}
              mapStyle={mapSettings.mapStyle}
              className="w-full h-full rounded-lg overflow-hidden"
            />
            <p className="text-[10px] text-muted-foreground text-center mt-1.5 select-none">
              Kliknij zielony pin, aby zobaczyć panoramę
            </p>
          </Card>

          {selectedPhotoIdx !== null &&
            results[selectedPhotoIdx] &&
            photos[selectedPhotoIdx] && (
              <PhotoModal
                photo={photos[selectedPhotoIdx]}
                result={results[selectedPhotoIdx]}
                stepNumber={selectedPhotoIdx + 1}
                totalSteps={photos.length}
                onClose={() => setSelectedPhotoIdx(null)}
              />
            )}

          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-card/50 border rounded-xl px-4 py-3"
              >
                <div className="size-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {scoreLabel(r.score)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistance(r.distanceM)} od celu
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      scoreColor(r.score),
                    )}
                  >
                    {r.score.toLocaleString("pl-PL")}
                  </span>
                  {r.timeBonus > 0 && (
                    <div className="text-xs text-muted-foreground">
                      +{r.timeBonus} bonus
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-2 pt-2">
            <Button asChild variant="brand" size="lg" className="sm:col-span-1">
              <Link href="/play">Zagraj ponownie</Link>
            </Button>
            <ShareButton
              url={`${typeof window !== "undefined" ? window.location.origin : ""}/results/${roundId}`}
              score={totalScore ?? 0}
            />
            <Button asChild variant="outline" size="lg">
              <Link href="/leaderboard">
                <Trophy />
                Ranking
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Playing / revealed ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Header */}
      <div className="shrink-0">
        <div className="px-3 sm:px-4 py-2.5 bg-background/95 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size="sm" showWordmark={false} />
            <StepDots
              total={photos.length}
              current={step}
              done={results.length}
            />
          </div>
          <div className="flex items-center gap-3 text-sm">
            {tournamentCode && tournamentPlayers.length > 0 && (
              <TournamentScoreRibbon players={tournamentPlayers} />
            )}
            {phase === "playing" && timeLimitS > 0 && (
              <div
                className={cn(
                  "flex items-center gap-1 tabular-nums font-semibold",
                  timeLeft > timeLimitS * 0.5
                    ? "text-success"
                    : timeLeft > timeLimitS * 0.2
                      ? "text-warning"
                      : "text-destructive",
                )}
              >
                <Clock className="size-3.5" />
                {timeLeft}s
              </div>
            )}
            <span className="text-muted-foreground hidden sm:inline">
              Wynik
            </span>
            <span className="font-semibold tabular-nums">
              {runningScore.toLocaleString("pl-PL")}
            </span>
          </div>
        </div>
        {phase === "playing" && timeLimitS > 0 && (
          <div className="h-1 bg-muted border-b border-border">
            <div
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                timeLeft > timeLimitS * 0.5
                  ? "bg-success"
                  : timeLeft > timeLimitS * 0.2
                    ? "bg-warning"
                    : "bg-destructive",
              )}
              style={{ width: `${(timeLeft / timeLimitS) * 100}%` }}
            />
          </div>
        )}
        {(phase !== "playing" || timeLimitS === 0) && (
          <div className="border-b border-border" />
        )}
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <div className="flex-[3] relative min-h-0">
          {tilesManifest && (
            <PanoramaViewer
              key={tilesManifest.photoId}
              tilesManifest={tilesManifest}
              className="w-full h-full"
            />
          )}
          <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/70 backdrop-blur px-2.5 py-1 text-xs text-muted-foreground border">
            <span className="font-medium text-foreground">{step + 1}</span>
            <span>z {photos.length}</span>
          </div>
          {currentPhoto?.difficulty && (
            <div
              className={cn(
                "absolute top-3 right-3 z-10 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border backdrop-blur",
                DIFFICULTY_COLORS[currentPhoto.difficulty],
              )}
            >
              {DIFFICULTY_LABELS[currentPhoto.difficulty]}
            </div>
          )}
        </div>

        <div className="flex-[2] relative border-t md:border-t-0 md:border-l border-border min-h-[260px] md:min-h-0">
          <GuessMap
            onConfirm={handleGuess}
            disabled={phase === "revealed" || submitting}
            actualLocation={
              currentResult
                ? { lat: currentResult.actualLat, lng: currentResult.actualLng }
                : undefined
            }
            stepKey={step}
            initialCenter={[mapSettings.centerLng, mapSettings.centerLat]}
            initialZoom={mapSettings.defaultZoom}
            mapStyle={mapSettings.mapStyle}
            className="w-full h-full"
            onPinChange={(pin) => {
              pendingPinRef.current = pin;
            }}
          />

          {submitting && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm z-20">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Sprawdzam…
              </div>
            </div>
          )}

          {phase === "revealed" && currentResult && (
            <div
              className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none z-20 px-3"
              style={{
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
            >
              <ResultOverlay
                result={currentResult}
                tags={currentPhoto?.tags ?? []}
                stepNumber={step + 1}
                totalSteps={photos.length}
                onNext={handleNext}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepDots({
  total,
  current,
  done,
}: {
  total: number;
  current: number;
  done: number;
}) {
  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`Krok ${current + 1} z ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i < done
              ? "w-6 bg-success"
              : i === current
                ? "w-6 bg-foreground"
                : "w-1.5 bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

function PhotoModal({
  photo,
  result,
  stepNumber,
  totalSteps,
  onClose,
}: {
  photo: ResultsMapPhoto;
  result: StepResult;
  stepNumber: number;
  totalSteps: number;
  onClose: () => void;
}) {
  const tilesManifest: TileManifest = {
    photoId: photo.photoId,
    baseUrl: photo.tileBaseUrl,
    heading: photo.heading,
    defaultYaw: photo.defaultYaw,
    levels: photo.tileLevels,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full h-full max-w-3xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-black/60">
          <span className="text-white/80 text-sm font-medium">
            Panorama {stepNumber} z {totalSteps}
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Zamknij"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Panorama */}
        <div className="flex-1 min-h-0">
          <PanoramaViewer
            key={photo.photoId}
            tilesManifest={tilesManifest}
            className="w-full h-full"
          />
        </div>

        {/* Info bar */}
        <div className="shrink-0 bg-black/70 backdrop-blur px-4 py-3 flex items-center gap-4">
          <div className="size-8 rounded-full bg-success/20 border border-success/40 flex items-center justify-center text-xs font-bold text-success shrink-0">
            {stepNumber}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn("font-semibold text-sm", scoreColor(result.score))}
            >
              {scoreLabel(result.score)} ·{" "}
              {result.score.toLocaleString("pl-PL")} pkt
            </p>
            <p className="text-xs text-white/50">
              {formatDistance(result.distanceM)} od celu
              {result.timeBonus > 0 && (
                <span className="text-success ml-1.5">
                  +{result.timeBonus} bonus czasowy
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TournamentScoreRibbon({
  players,
}: {
  players: TournamentPlayerScore[];
}) {
  const sorted = [...players]
    .sort((a, b) => b.currentScore - a.currentScore)
    .slice(0, 3);
  return (
    <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
      <Users className="size-3 shrink-0" />
      {sorted.map((p, i) => (
        <span key={p.id} className="flex items-center gap-0.5">
          {i > 0 && <span className="text-border mx-0.5">·</span>}
          <span className="font-medium text-foreground/70 truncate max-w-[60px]">
            {p.displayName.split(" ")[0]}
          </span>
          <span className="tabular-nums">
            {p.currentScore.toLocaleString("pl-PL")}
          </span>
        </span>
      ))}
    </div>
  );
}

function ResultOverlay({
  result,
  tags,
  stepNumber,
  totalSteps,
  onNext,
}: {
  result: StepResult;
  tags: { id: string; name: string; color: string }[];
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
}) {
  const isLast = stepNumber >= totalSteps;

  return (
    <div
      className={cn(
        "bg-card/95 backdrop-blur-xl border rounded-2xl shadow-xl pointer-events-auto w-full",
        "animate-in slide-in-from-bottom-3 fade-in duration-250",
      )}
    >
      <div className="px-4 py-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {scoreLabel(result.score)}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  scoreColor(result.score),
                )}
              >
                {result.score.toLocaleString("pl-PL")}
              </span>
              <span className="text-xs text-muted-foreground">pkt</span>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground shrink-0">
            <div className="font-medium text-foreground/80">
              {formatDistance(result.distanceM)} od celu
            </div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span>Bazowe {result.baseScore.toLocaleString("pl-PL")}</span>
              {result.timeBonus > 0 && (
                <span className="text-success">
                  +{result.timeBonus} pkt bonus
                </span>
              )}
            </div>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                style={{
                  color: tag.color,
                  borderColor: tag.color + "55",
                  background: tag.color + "18",
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <Button
          onClick={onNext}
          variant="brand"
          size="default"
          className="w-full h-10"
        >
          {isLast ? (
            <>
              <Trophy />
              Zobacz wyniki
            </>
          ) : (
            <>
              Panorama {stepNumber + 1} z {totalSteps}
              <ArrowRight />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
