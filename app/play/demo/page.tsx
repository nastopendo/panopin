"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { GuessResult } from "@/components/map/GuessMap";

// Browser-only components — disable SSR
const PanoramaViewer = dynamic(() => import("@/components/panorama/Viewer"), { ssr: false });
const GuessMap = dynamic(() => import("@/components/map/GuessMap"), { ssr: false });

// Public test panorama from Photo Sphere Viewer docs
const DEMO_PANORAMA = "https://photo-sphere-viewer-data.netlify.app/assets/sphere.jpg";

// Actual location of the demo panorama (Palais de Tokyo, Paris)
const DEMO_ACTUAL = { lat: 48.8647, lng: 2.2947 };

export default function DemoPage() {
  const [guess, setGuess] = useState<GuessResult | null>(null);

  function handleConfirm(result: GuessResult) {
    setGuess(result);
  }

  const distance =
    guess
      ? Math.round(
          6371000 *
            Math.acos(
              Math.min(
                1,
                Math.sin((guess.lat * Math.PI) / 180) *
                  Math.sin((DEMO_ACTUAL.lat * Math.PI) / 180) +
                  Math.cos((guess.lat * Math.PI) / 180) *
                    Math.cos((DEMO_ACTUAL.lat * Math.PI) / 180) *
                    Math.cos(((DEMO_ACTUAL.lng - guess.lng) * Math.PI) / 180),
              ),
            ),
        )
      : null;

  return (
    <div className="flex flex-col h-screen bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-white font-semibold text-sm">Panopin — demo</span>
        {guess && (
          <span className="text-zinc-300 text-sm">
            Twój wynik: <strong className="text-white">{distance?.toLocaleString("pl")} m</strong> od celu
          </span>
        )}
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panorama — left 60% */}
        <div className="flex-[3] relative">
          <PanoramaViewer equirectUrl={DEMO_PANORAMA} className="w-full h-full" />
        </div>

        {/* Map — right 40% */}
        <div className="flex-[2] relative border-l border-zinc-800">
          <GuessMap
            onConfirm={handleConfirm}
            disabled={!!guess}
            actualLocation={guess ? DEMO_ACTUAL : undefined}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Result overlay */}
      {guess && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-zinc-900/95 border border-zinc-700 rounded-2xl p-8 text-center shadow-2xl pointer-events-auto max-w-sm mx-4">
            <div className="text-5xl font-bold text-white mb-1">
              {distance?.toLocaleString("pl")} m
            </div>
            <div className="text-zinc-400 text-sm mb-4">od rzeczywistej lokalizacji</div>
            <a
              href="/play/demo"
              className="block w-full bg-zinc-100 text-zinc-900 rounded-xl py-2.5 text-sm font-semibold hover:bg-white transition-colors"
            >
              Zagraj ponownie
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
