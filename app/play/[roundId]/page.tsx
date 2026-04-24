"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { TileManifest } from "@/components/panorama/Viewer";
import type { GuessResult } from "@/components/map/GuessMap";
import type { MapStyle } from "@/lib/map-styles";

const PanoramaViewer = dynamic(() => import("@/components/panorama/Viewer"), { ssr: false });
const GuessMap = dynamic(() => import("@/components/map/GuessMap"), { ssr: false });
const ResultsMap = dynamic(() => import("@/components/map/ResultsMap"), { ssr: false });
const ShareButton = dynamic(() => import("@/components/ShareButton").then((m) => ({ default: m.ShareButton })), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoundPhoto {
  photoId: string;
  tileBaseUrl: string;
  heading: number;
  tileLevels: Array<{ faceSize: number; nbTiles: number }>;
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
  if (score >= 4000) return "text-emerald-400";
  if (score >= 2000) return "text-yellow-400";
  return "text-red-400";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoundPage() {
  const { roundId } = useParams<{ roundId: string }>();

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [photos, setPhotos] = useState<RoundPhoto[]>([]);
  const [mapSettings, setMapSettings] = useState<MapSettings>(DEFAULT_MAP_SETTINGS);
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<StepResult[]>([]);
  const [currentResult, setCurrentResult] = useState<StepResult | null>(null);
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const [topPercent, setTopPercent] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stepStartRef = useRef<number>(0);

  // Load round + map settings in parallel
  useEffect(() => {
    Promise.all([
      fetch(`/api/rounds/${roundId}`).then((r) => r.json()),
      fetch("/api/map-settings").then((r) => r.json()),
    ])
      .then(([roundData, settingsData]) => {
        if (roundData.error) throw new Error(roundData.error);
        setPhotos(roundData.photos);
        setMapSettings({
          centerLat: settingsData.centerLat ?? DEFAULT_MAP_SETTINGS.centerLat,
          centerLng: settingsData.centerLng ?? DEFAULT_MAP_SETTINGS.centerLng,
          defaultZoom: settingsData.defaultZoom ?? DEFAULT_MAP_SETTINGS.defaultZoom,
          mapStyle: settingsData.mapStyle ?? DEFAULT_MAP_SETTINGS.mapStyle,
        });
        stepStartRef.current = Date.now();
        setPhase("playing");
      })
      .catch((e) => {
        setErrorMsg(e.message ?? "Nie można wczytać rundy");
        setPhase("error");
      });
  }, [roundId]);

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
        const res = await fetch(`/api/rounds/${roundId}/finish`, { method: "POST" });
        const data = await res.json();
        setTotalScore(data.totalScore);
        setTopPercent(data.topPercent ?? null);
      } catch {
        const localTotal = results.reduce((s, r) => s + r.score, 0) + (currentResult?.score ?? 0);
        setTotalScore(localTotal);
      }
      setPhase("finished");
    } else {
      setStep((s) => s + 1);
      setCurrentResult(null);
      setPhase("playing");
      stepStartRef.current = Date.now();
    }
  }

  // ─── Current photo manifest ──────────────────────────────────────────────

  const currentPhoto = photos[step];
  const tilesManifest: TileManifest | undefined = currentPhoto
    ? {
        photoId: currentPhoto.photoId,
        baseUrl: currentPhoto.tileBaseUrl,
        heading: currentPhoto.heading,
        levels: currentPhoto.tileLevels,
      }
    : undefined;

  const runningScore = results.reduce((s, r) => s + r.score, 0);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        Ładowanie rundy…
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-red-400">
        {errorMsg}
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="min-h-screen bg-zinc-950 text-white overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
          {/* Score header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-1">Koniec rundy!</h1>
            <div className="text-6xl font-bold">{totalScore?.toLocaleString("pl")}</div>
            <div className="text-zinc-400 text-sm mt-1">punktów łącznie</div>
            {topPercent !== null && (
              <div className="mt-2 text-sm font-medium text-emerald-400">
                Jesteś w top {topPercent}% graczy!
              </div>
            )}
          </div>

          {/* Results map */}
          <div className="rounded-2xl overflow-hidden border border-zinc-800 h-[360px]">
            <ResultsMap
              results={results}
              mapStyle={mapSettings.mapStyle}
              className="w-full h-full"
            />
          </div>

          {/* Per-step results */}
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 text-sm text-zinc-400">
                  {formatDistance(r.distanceM)} od celu
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${scoreColor(r.score)}`}>
                    {r.score.toLocaleString("pl")} pkt
                  </span>
                  {r.timeBonus > 0 && (
                    <div className="text-zinc-600 text-xs">+{r.timeBonus} bonus czas</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/play"
              className="px-6 py-3 bg-white text-zinc-900 rounded-xl font-semibold hover:bg-zinc-100 transition-colors"
            >
              Zagraj ponownie
            </Link>
            <ShareButton
              url={`${typeof window !== "undefined" ? window.location.origin : ""}/results/${roundId}`}
              score={totalScore ?? 0}
            />
            <Link
              href="/leaderboard"
              className="px-6 py-3 border border-zinc-700 text-zinc-400 rounded-xl hover:border-zinc-500 transition-colors"
            >
              Ranking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-950 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">Panopin</span>
          <StepDots total={photos.length} current={step} done={results.length} />
        </div>
        <div className="text-zinc-400 text-sm">
          Wynik:{" "}
          <span className="text-white font-semibold">{runningScore.toLocaleString("pl")}</span>
        </div>
      </div>

      {/* Game area */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Panorama */}
        <div className="flex-[3] relative min-h-0">
          {tilesManifest && (
            <PanoramaViewer tilesManifest={tilesManifest} className="w-full h-full" />
          )}
        </div>

        {/* Map */}
        <div className="flex-[2] relative border-t md:border-t-0 md:border-l border-zinc-800 min-h-[240px] md:min-h-0">
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
          />

          {submitting && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60">
              <div className="text-white text-sm">Sprawdzam…</div>
            </div>
          )}
        </div>
      </div>

      {/* Result overlay */}
      {phase === "revealed" && currentResult && (
        <ResultOverlay
          result={currentResult}
          stepNumber={step + 1}
          totalSteps={photos.length}
          onNext={handleNext}
        />
      )}
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
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < done ? "bg-emerald-500" : i === current ? "bg-white" : "bg-zinc-600"
          }`}
        />
      ))}
    </div>
  );
}

function ResultOverlay({
  result,
  stepNumber,
  totalSteps,
  onNext,
}: {
  result: StepResult;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
}) {
  const isLast = stepNumber >= totalSteps;

  return (
    <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-6 pointer-events-none z-10">
      <div className="bg-zinc-950/95 border border-zinc-700 rounded-2xl p-5 shadow-2xl pointer-events-auto w-full max-w-sm mx-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className={`text-3xl font-bold ${scoreColor(result.score)}`}>
              {result.score.toLocaleString("pl")} pkt
            </div>
            <div className="text-zinc-400 text-sm mt-0.5">
              {formatDistance(result.distanceM)} od celu
            </div>
          </div>
          <div className="text-right text-xs text-zinc-500 space-y-0.5">
            <div>Bazowe: {result.baseScore.toLocaleString("pl")}</div>
            <div>Czas: +{result.timeBonus}</div>
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full bg-white text-zinc-900 rounded-xl py-2.5 text-sm font-semibold hover:bg-zinc-100 transition-colors"
        >
          {isLast ? "Zobacz wyniki" : `Panorama ${stepNumber + 1} z ${totalSteps}`}
        </button>
      </div>
    </div>
  );
}
