"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Crown,
  Loader2,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/auth/client";
import { ensureGuestSession } from "@/lib/auth/guest";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import type { TournamentStatus } from "@/lib/db/schema";
import type { MapStyle } from "@/lib/map-styles";
import type { ResultsMapPhoto } from "@/components/map/ResultsMap";

const ResultsMap = dynamic(() => import("@/components/map/ResultsMap"), { ssr: false });
const PanoramaViewer = dynamic(() => import("@/components/panorama/Viewer"), { ssr: false });
import type { TileManifest } from "@/components/panorama/Viewer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TournamentPlayer {
  id: string;
  userId: string;
  displayName: string;
  isHost: boolean;
  currentScore: number;
  finishedAt: string | null;
  roundId: string | null;
  joinedAt: string;
}

interface TournamentState {
  id: string;
  code: string;
  status: TournamentStatus;
  hostId: string;
  filterDifficulties: string[] | null;
  filterTagIds: string[] | null;
  startedAt: string | null;
  finishedAt: string | null;
  players: TournamentPlayer[];
}

interface GuessResult {
  sequence: number;
  guessLat: number | null;
  guessLng: number | null;
  actualLat: number;
  actualLng: number;
  distanceM: number | null;
  score: number | null;
}

interface MapData {
  photos: ResultsMapPhoto[];
  guesses: GuessResult[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Łatwe",
  medium: "Średnie",
  hard: "Trudne",
  extreme: "Ekstremalne",
};

function difficultyLabel(d: string): string {
  return DIFFICULTY_LABELS[d] ?? d;
}

function sortedByScore(players: TournamentPlayer[]): TournamentPlayer[] {
  return [...players].sort((a, b) => b.currentScore - a.currentScore);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TournamentPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "error" | "lobby" | "playing" | "finished">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>("street");

  // Inline join state (for visitors who arrive via share link)
  const [notJoined, setNotJoined] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createSupabaseBrowserClient>["channel"]
  > | null>(null);

  // Pure helper — no state deps, safe to define first
  function resolvePhase(
    t: TournamentState,
  ): "lobby" | "playing" | "finished" {
    if (t.status === "finished") return "finished";
    if (t.status === "playing") return "playing";
    return "lobby";
  }

  async function refetch() {
    try {
      const res = await fetch(`/api/tournaments/${code}`);
      if (!res.ok) return;
      const data: TournamentState = await res.json();
      setTournament(data);
      setPhase(resolvePhase(data));
    } catch {
      // silent — keep showing last known state
    }
  }

  // ─── Initial load + auth ─────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function init() {
      try {
        await ensureGuestSession();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);

        const res = await fetch(`/api/tournaments/${code}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const data: TournamentState = await res.json();
        setTournament(data);
        setPhase(resolvePhase(data));

        // Visitor arrived via share link — not in the player list yet
        const userId = user?.id;
        const isPlayer = data.players.some((p) => p.userId === userId);
        if (!isPlayer && data.status === "lobby") {
          setNotJoined(true);
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Nie można wczytać turnieju");
        setPhase("error");
      }
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // ─── Load map data when tournament finishes ──────────────────────────────

  useEffect(() => {
    if (phase !== "finished" || !tournament || !currentUserId || mapData) return;
    const me = tournament.players.find((p) => p.userId === currentUserId);
    if (!me?.roundId) return;

    fetch(`/api/rounds/${me.roundId}/guesses`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setMapData({ photos: data.photos, guesses: data.guesses });
      })
      .catch(() => {});
  }, [phase, tournament, currentUserId, mapData]);

  // ─── Load map settings ───────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/map-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.mapStyle) setMapStyle(data.mapStyle as MapStyle);
      })
      .catch(() => {});
  }, []);

  // ─── Redirect playing users to their game ────────────────────────────────

  useEffect(() => {
    if (phase === "playing" && tournament && currentUserId) {
      const me = tournament.players.find((p) => p.userId === currentUserId);
      if (me?.roundId && !me.finishedAt) {
        router.push(`/play/${me.roundId}?tournament=${code}`);
      }
    }
  }, [phase, tournament, currentUserId, code, router]);

  // ─── Realtime subscription ───────────────────────────────────────────────

  useEffect(() => {
    if (!tournament) return;
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`tournament-${tournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_players",
          filter: `tournament_id=eq.${tournament.id}`,
        },
        () => { void refetch(); },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournament.id}`,
        },
        () => { void refetch(); },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.id]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function handleStart() {
    if (starting) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      // Realtime will fire + refetch will update phase
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Błąd startu");
    } finally {
      setStarting(false);
    }
  }

  async function handleForceFinish() {
    if (finishing) return;
    setFinishing(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/finish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Błąd zakończenia");
    } finally {
      setFinishing(false);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyLink() {
    const url = `${window.location.origin}/tournament/${code}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleInlineJoin() {
    const trimmed = joinName.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setJoinError("Nick musi mieć od 2 do 30 znaków");
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch(`/api/tournaments/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setNotJoined(false);
      await refetch();
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Nie udało się dołączyć");
    } finally {
      setJoining(false);
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-aurora">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Wczytywanie turnieju…</p>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 p-6 text-center bg-aurora">
        <p className="text-destructive font-medium">{errorMsg}</p>
        <Button asChild variant="outline">
          <Link href="/tournament">
            <ArrowLeft />
            Wróć
          </Link>
        </Button>
      </div>
    );
  }

  if (!tournament) return null;

  const me = tournament.players.find((p) => p.userId === currentUserId);
  const isHost = me?.isHost ?? false;
  const ranked = sortedByScore(tournament.players);

  // ─── Inline join (visitor via share link) ───────────────────────────────

  if (notJoined && phase === "lobby") {
    return (
      <div className="min-h-dvh bg-aurora flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col gap-5">
          <div className="text-center">
            <span className="text-4xl font-bold tracking-[0.25em] tabular-nums">
              {tournament?.code}
            </span>
            <h1 className="mt-3 text-xl font-semibold">Dołącz do turnieju</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tournament?.players.length ?? 0} graczy czeka w lobby
            </p>
          </div>

          <Card className="bg-card/60 backdrop-blur-md p-5 flex flex-col gap-4">
            <div className="space-y-1.5">
              <label htmlFor="join-name" className="text-sm font-medium">
                Twój nick
              </label>
              <Input
                id="join-name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInlineJoin()}
                maxLength={30}
                placeholder="Np. Kasia"
                autoFocus
              />
              {joinError && <p className="text-xs text-destructive">{joinError}</p>}
            </div>

            <Button
              onClick={handleInlineJoin}
              disabled={joining}
              variant="brand"
              size="lg"
              className="w-full"
            >
              {joining ? (
                <><Loader2 className="animate-spin" />Dołączam…</>
              ) : (
                <><Users />Dołącz do turnieju</>
              )}
            </Button>
          </Card>

          <Button asChild variant="ghost" size="sm" className="mx-auto">
            <Link href="/">
              <ArrowLeft />
              Strona główna
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // ─── Lobby ───────────────────────────────────────────────────────────────

  if (phase === "lobby") {
    return (
      <div className="min-h-dvh bg-aurora flex flex-col">
        <header className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft />
              <span className="hidden sm:inline">Strona główna</span>
            </Link>
          </Button>
        </header>

        <main className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
          <div className="w-full max-w-md flex flex-col gap-5">
            {/* Code block */}
            <Card className="bg-card/60 backdrop-blur-md p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Kod turnieju
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-bold tracking-[0.25em] tabular-nums">
                  {tournament.code}
                </span>
                <button
                  onClick={copyCode}
                  className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="Kopiuj kod"
                >
                  {copied ? (
                    <Check className="size-4 text-success" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>

              <button
                onClick={copyLink}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {copiedLink ? (
                  <><Check className="size-3 text-success" />Link skopiowany!</>
                ) : (
                  <><Copy className="size-3" />Kopiuj link zaproszenia</>
                )}
              </button>

              <p className="text-xs text-muted-foreground mt-2">
                Podaj kod lub wyślij link znajomym
              </p>

              {((tournament.filterDifficulties?.length ?? 0) > 0 || (tournament.filterTagIds?.length ?? 0) > 0) && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {(tournament.filterDifficulties ?? []).map((d) => (
                    <Badge key={d} variant="secondary" className="text-xs">
                      {difficultyLabel(d)}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* Players */}
            <Card className="bg-card/60 backdrop-blur-md overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Gracze ({tournament.players.length}/20)
                </span>
              </div>
              <ul className="divide-y">
                {tournament.players.map((p) => (
                  <li key={p.id} className="px-4 py-3 flex items-center gap-3">
                    <div
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        p.userId === currentUserId
                          ? "bg-brand/20 text-brand ring-1 ring-brand/40"
                          : "bg-secondary",
                      )}
                    >
                      {getInitials(p.displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {p.displayName}
                        {p.userId === currentUserId && (
                          <span className="text-xs text-muted-foreground ml-1">(ty)</span>
                        )}
                      </span>
                    </div>
                    {p.isHost && (
                      <Crown className="size-4 text-amber-400 shrink-0" aria-label="Host" />
                    )}
                  </li>
                ))}
              </ul>
            </Card>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {errorMsg}
              </div>
            )}

            {isHost ? (
              <Button
                onClick={handleStart}
                disabled={starting || tournament.players.length < 1}
                size="xl"
                variant="brand"
                className="w-full"
              >
                {starting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Startuję…
                  </>
                ) : (
                  <>
                    <Zap />
                    Rozpocznij turniej
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Oczekiwanie na hosta…
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ─── Playing — current user already redirected to /play; show live board
  //              for users who have finished but wait for others             ─

  if (phase === "playing") {
    const myPlayer = tournament.players.find((p) => p.userId === currentUserId);
    const myFinished = !!myPlayer?.finishedAt;

    return (
      <div className="min-h-dvh bg-aurora flex flex-col">
        <header className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          {isHost && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceFinish}
              disabled={finishing}
            >
              {finishing ? <Loader2 className="size-4 animate-spin" /> : "Zakończ teraz"}
            </Button>
          )}
        </header>

        <main className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
          <div className="w-full max-w-md flex flex-col gap-5">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
                <Zap className="size-3 text-brand" />
                Turniej w toku
              </span>
              <p className="text-muted-foreground text-sm mt-2">
                {myFinished
                  ? "Skończyłeś — czekasz na pozostałych"
                  : "Gra trwa w innej zakładce"}
              </p>
              {!myFinished && myPlayer?.roundId && (
                <Button
                  asChild
                  variant="brand"
                  size="lg"
                  className="mt-3"
                >
                  <Link href={`/play/${myPlayer.roundId}?tournament=${code}`}>
                    Wróć do gry
                  </Link>
                </Button>
              )}
            </div>

            <LiveLeaderboard players={ranked} currentUserId={currentUserId} />

            {errorMsg && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {errorMsg}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ─── Finished ─────────────────────────────────────────────────────────────

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

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <Trophy className="size-3 text-brand" />
            Koniec turnieju
          </span>
          <h1 className="mt-3 text-3xl font-bold">Wyniki końcowe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tournament.code} · {tournament.players.length} graczy
          </p>
        </div>

        {/* Podium — top 3 */}
        {ranked.length >= 1 && <Podium players={ranked.slice(0, 3)} currentUserId={currentUserId} />}

        {/* My guesses map */}
        {mapData && mapData.guesses.length > 0 && (
          <Card className="p-2 overflow-hidden h-[320px] bg-card/60">
            <ResultsMap
              results={mapData.guesses.map((g) => ({
                guessLat: g.guessLat ?? 0,
                guessLng: g.guessLng ?? 0,
                actualLat: g.actualLat,
                actualLng: g.actualLng,
              }))}
              photos={mapData.photos}
              onPhotoClick={setSelectedPhotoIdx}
              mapStyle={mapStyle}
              className="w-full h-full rounded-lg overflow-hidden"
            />
            <p className="text-[10px] text-muted-foreground text-center mt-1.5 select-none">
              Twoje strzały — kliknij zielony pin, aby zobaczyć panoramę
            </p>
          </Card>
        )}

        {selectedPhotoIdx !== null && mapData?.photos[selectedPhotoIdx] && (
          <TournamentPhotoModal
            photo={mapData.photos[selectedPhotoIdx]}
            guess={mapData.guesses[selectedPhotoIdx]}
            stepNumber={selectedPhotoIdx + 1}
            totalSteps={mapData.photos.length}
            onClose={() => setSelectedPhotoIdx(null)}
          />
        )}

        {/* Full table */}
        <Card className="bg-card/60 backdrop-blur-md overflow-hidden">
          <ul className="divide-y">
            {ranked.map((p, i) => (
              <li
                key={p.id}
                className={cn(
                  "px-4 py-3 flex items-center gap-3",
                  p.userId === currentUserId && "bg-brand/5",
                )}
              >
                <span className="w-6 text-center text-sm font-semibold text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    p.userId === currentUserId
                      ? "bg-brand/20 text-brand ring-1 ring-brand/40"
                      : "bg-secondary",
                  )}
                >
                  {getInitials(p.displayName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.displayName}
                    {p.userId === currentUserId && (
                      <span className="text-xs text-muted-foreground ml-1">(ty)</span>
                    )}
                  </p>
                  {!p.finishedAt && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      Nie ukończył
                    </p>
                  )}
                </div>
                <span className="font-semibold tabular-nums text-sm shrink-0">
                  {p.currentScore.toLocaleString("pl-PL")}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="brand" size="lg">
            <Link href="/tournament">Nowy turniej</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Strona główna</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveLeaderboard({
  players,
  currentUserId,
}: {
  players: TournamentPlayer[];
  currentUserId: string | null;
}) {
  return (
    <Card className="bg-card/60 backdrop-blur-md overflow-hidden">
      <div className="px-4 py-3 border-b text-sm font-medium">
        Wyniki na żywo
      </div>
      <ul className="divide-y">
        {players.map((p, i) => (
          <li
            key={p.id}
            className={cn(
              "px-4 py-3 flex items-center gap-3",
              p.userId === currentUserId && "bg-brand/5",
            )}
          >
            <span className="w-5 text-center text-xs font-semibold text-muted-foreground shrink-0">
              {i + 1}
            </span>
            <div
              className={cn(
                "size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                p.userId === currentUserId
                  ? "bg-brand/20 text-brand ring-1 ring-brand/40"
                  : "bg-secondary",
              )}
            >
              {getInitials(p.displayName)}
            </div>
            <span className="flex-1 text-sm truncate">
              {p.displayName}
              {p.userId === currentUserId && (
                <span className="text-xs text-muted-foreground ml-1">(ty)</span>
              )}
            </span>
            {p.finishedAt ? (
              <Check className="size-3.5 text-success shrink-0" />
            ) : (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" />
            )}
            <span className="font-semibold tabular-nums text-sm shrink-0 w-16 text-right">
              {p.currentScore.toLocaleString("pl-PL")}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const PLACE_STYLES = [
  "bg-amber-400/20 text-amber-500 ring-1 ring-amber-400/40",
  "bg-slate-300/20 text-slate-400 ring-1 ring-slate-300/40",
  "bg-orange-400/20 text-orange-500 ring-1 ring-orange-400/40",
];

const PLACE_ICONS = ["🥇", "🥈", "🥉"];

function Podium({
  players,
  currentUserId,
}: {
  players: TournamentPlayer[];
  currentUserId: string | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {players.map((p, i) => (
        <Card
          key={p.id}
          className={cn(
            "bg-card/60 backdrop-blur-md p-3 text-center flex flex-col items-center gap-1.5",
            i === 0 && "col-span-3 sm:col-span-1 sm:order-2",
            p.userId === currentUserId && "ring-1 ring-brand/40",
          )}
        >
          <div className="text-xl">{PLACE_ICONS[i]}</div>
          <div
            className={cn(
              "size-10 rounded-full flex items-center justify-center text-sm font-bold",
              PLACE_STYLES[i] ?? "bg-secondary",
            )}
          >
            {getInitials(p.displayName)}
          </div>
          <p className="text-xs font-medium truncate w-full">{p.displayName}</p>
          <p className="text-base font-bold tabular-nums">
            {p.currentScore.toLocaleString("pl-PL")}
          </p>
        </Card>
      ))}
    </div>
  );
}

function formatDistance(m: number | null): string {
  if (m == null) return "—";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function TournamentPhotoModal({
  photo,
  guess,
  stepNumber,
  totalSteps,
  onClose,
}: {
  photo: ResultsMapPhoto;
  guess: GuessResult;
  stepNumber: number;
  totalSteps: number;
  onClose: () => void;
}) {
  const tilesManifest: TileManifest = {
    photoId: photo.photoId,
    baseUrl: photo.tileBaseUrl,
    heading: photo.heading,
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
        <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-black/60">
          <span className="text-white/80 text-sm font-medium">
            Lokalizacja {stepNumber} z {totalSteps}
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Zamknij"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <PanoramaViewer
            key={photo.photoId}
            tilesManifest={tilesManifest}
            className="w-full h-full"
          />
        </div>

        <div className="shrink-0 bg-black/70 backdrop-blur px-4 py-3 flex items-center gap-4">
          <div className="size-8 rounded-full bg-success/20 border border-success/40 flex items-center justify-center text-xs font-bold text-success shrink-0">
            {stepNumber}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white">
              {(guess.score ?? 0).toLocaleString("pl-PL")} pkt
            </p>
            <p className="text-xs text-white/50">
              {formatDistance(guess.distanceM)} od celu
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
