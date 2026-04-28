"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import type { GuessResult } from "@/components/map/GuessMap";

const PanoramaViewer = dynamic(() => import("@/components/panorama/Viewer"), { ssr: false });
const GuessMap = dynamic(() => import("@/components/map/GuessMap"), { ssr: false });

const DEMO_PANORAMA = "https://photo-sphere-viewer-data.netlify.app/assets/sphere.jpg";
const DEMO_ACTUAL = { lat: 48.8647, lng: 2.2947 };

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(h)));
}

export default function DemoPage() {
  const [guess, setGuess] = useState<GuessResult | null>(null);

  const distance = guess ? haversineM(guess, DEMO_ACTUAL) : null;

  return (
    <div className="flex flex-col h-svh bg-background text-foreground">
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Logo size="sm" showWordmark={false} />
          <span className="text-sm font-semibold tracking-tight">Demo</span>
        </div>
        {guess && distance !== null && (
          <span className="text-sm text-muted-foreground">
            Twój wynik:{" "}
            <strong className="text-foreground tabular-nums">
              {distance.toLocaleString("pl")} m
            </strong>{" "}
            od celu
          </span>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Panorama */}
        <div className="flex-[3] relative">
          <PanoramaViewer equirectUrl={DEMO_PANORAMA} className="w-full h-full" />
        </div>

        {/* Map */}
        <div className="flex-[2] relative border-l border-border">
          <GuessMap
            onConfirm={(result) => setGuess(result)}
            disabled={!!guess}
            actualLocation={guess ? DEMO_ACTUAL : undefined}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Result overlay */}
      {guess && distance !== null && (
        <div
          className="absolute inset-0 flex items-end justify-center pointer-events-none z-20"
          style={{ paddingBottom: "max(4rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
        >
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl p-6 text-center shadow-2xl pointer-events-auto w-full max-w-xs mx-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="size-12 rounded-full bg-brand/15 ring-1 ring-brand/30 flex items-center justify-center mx-auto mb-3">
              <MapPin className="size-6 text-brand" />
            </div>
            <div className="text-4xl font-bold tabular-nums mb-1">
              {distance.toLocaleString("pl")} m
            </div>
            <p className="text-sm text-muted-foreground mb-5">od rzeczywistej lokalizacji</p>
            <div className="flex flex-col gap-2">
              <Button asChild variant="brand" size="lg" className="w-full">
                <Link href="/play">
                  Zagraj na serio
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setGuess(null)}
              >
                <RotateCcw className="size-4" />
                Zagraj ponownie
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
