"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Users,
  Target,
  Image as ImageIcon,
  Trophy,
  RefreshCcw,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/analytics/StatCard";
import { RoundsPerDayChart } from "@/components/admin/analytics/RoundsPerDayChart";
import { ScoreDistribution } from "@/components/admin/analytics/ScoreDistribution";
import { TagStats } from "@/components/admin/analytics/TagStats";
import { TopPhotos } from "@/components/admin/analytics/TopPhotos";
import type { AnalyticsData } from "@/lib/admin/analytics-data";

type State =
  | { status: "loading" }
  | { status: "ready"; data: AnalyticsData }
  | { status: "error"; message: string };

export default function AdminAnalyticsPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  const fetchAnalytics = useCallback(async () => {
    const res = await fetch("/api/admin/analytics", { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as AnalyticsData;
  }, []);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await fetchAnalytics();
      setState({ status: "ready", data });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: "error", message });
    }
  }, [fetchAnalytics]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchAnalytics();
        if (!cancelled) {
          setState({ status: "ready", data });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) {
          setState({ status: "error", message });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchAnalytics]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Analityka</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={state.status === "loading"}
        >
          {state.status === "loading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCcw className="size-4" />
          )}
          Odśwież
        </Button>
      </div>

      {state.status === "loading" && <LoadingView />}
      {state.status === "error" && (
        <ErrorView message={state.message} onRetry={load} />
      )}
      {state.status === "ready" && <DataView data={state.data} />}
    </div>
  );
}

function LoadingView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-16 bg-muted rounded animate-pulse" />
              <div className="mt-2 h-3 w-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-destructive">
            Nie udało się pobrać danych
          </p>
          <p className="font-mono text-xs text-destructive/80 whitespace-pre-wrap break-all">
            {message}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCcw className="size-4" />
        Spróbuj ponownie
      </Button>
    </div>
  );
}

function DataView({ data }: { data: AnalyticsData }) {
  const completionRate =
    data.totalRounds > 0
      ? Math.round((data.completedRounds / data.totalRounds) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Activity}
          title="Łącznie rund"
          value={data.totalRounds}
          sub={`${data.completedRounds.toLocaleString("pl-PL")} ukończonych (${completionRate}%)`}
        />
        <StatCard
          icon={Users}
          title="Aktywni gracze (7 dni)"
          value={data.active7}
          sub={`${data.returningPlayers.toLocaleString("pl-PL")} powracających`}
        />
        <StatCard
          icon={Target}
          title="Łącznie guessów"
          value={data.totalGuesses}
          sub={`śr. wynik ${data.avgScore.toLocaleString("pl-PL")} pkt`}
        />
        <StatCard
          icon={ImageIcon}
          title="Opublikowane zdjęcia"
          value={data.totalPhotos}
        />
        <StatCard
          icon={Users}
          title="Zarejestrowani gracze"
          value={data.totalPlayers}
        />
        <StatCard
          icon={Trophy}
          title="Turnieje"
          value={data.totalTournaments}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Rundy / dzień (ostatnie 30 dni)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RoundsPerDayChart data={data.roundsPerDay} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rozkład wyników</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDistribution data={data.scoreDist} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tagi (liczba zdjęć)</CardTitle>
          </CardHeader>
          <CardContent>
            <TagStats data={data.tagStats} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Najpopularniejsze zdjęcia (top 10 wg guessów)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TopPhotos data={data.topPhotos} />
        </CardContent>
      </Card>
    </div>
  );
}
