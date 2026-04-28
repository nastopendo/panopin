import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import { db } from "@/lib/db/client";
import { guesses, profiles, rounds } from "@/lib/db/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const ShareButton = dynamic(
  () => import("@/components/ShareButton").then((m) => ({ default: m.ShareButton })),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roundId: string }>;
}): Promise<Metadata> {
  const { roundId } = await params;
  const [round] = await db
    .select({ totalScore: rounds.totalScore })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);

  const score = round?.totalScore?.toLocaleString("pl-PL") ?? "—";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const imageUrl = `${siteUrl}/api/og/${roundId}`;

  return {
    title: `${score} pkt w Panopin`,
    description: `Sprawdź czy pobijesz mój wynik ${score} punktów z 5 lokalizacji.`,
    openGraph: {
      title: `Panopin — ${score} pkt`,
      description: `Zdobyłem ${score} pkt z 5 lokalizacji!`,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Panopin — ${score} pkt`,
      images: [imageUrl],
    },
  };
}

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function scoreColor(score: number): string {
  if (score >= 4000) return "text-success";
  if (score >= 2000) return "text-warning";
  return "text-destructive";
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;

  const [round] = await db
    .select({
      id: rounds.id,
      totalScore: rounds.totalScore,
      completedAt: rounds.completedAt,
      userId: rounds.userId,
    })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);

  if (!round || !round.completedAt) notFound();

  const stepResults = await db
    .select({
      sequence: guesses.sequence,
      score: guesses.score,
      distanceM: guesses.distanceM,
      timeSpentMs: guesses.timeSpentMs,
    })
    .from(guesses)
    .where(eq(guesses.roundId, roundId))
    .orderBy(guesses.sequence);

  let displayName: string | null = null;
  if (round.userId) {
    const [profile] = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, round.userId))
      .limit(1);
    displayName = profile?.displayName ?? null;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const shareUrl = `${siteUrl}/results/${roundId}`;

  return (
    <main className="bg-aurora min-h-screen">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between">
        <Logo size="md" />
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft />
            <span className="hidden sm:inline">Strona główna</span>
          </Link>
        </Button>
      </header>

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6">
        <Card className="p-6 sm:p-8 text-center bg-card/60 backdrop-blur-md">
          <Avatar className="size-12 mx-auto">
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <p className="mt-3 text-sm text-muted-foreground">
            {displayName ?? "Anonimowy gracz"}
          </p>
          <div className="mt-2 text-6xl font-bold tabular-nums tracking-tight">
            {round.totalScore?.toLocaleString("pl-PL")}
          </div>
          <p className="mt-1 text-muted-foreground text-sm">punktów z 5 lokalizacji</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {round.completedAt && new Date(round.completedAt).toLocaleDateString("pl-PL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </Card>

        <div className="space-y-2">
          {stepResults.map((r) => (
            <div
              key={r.sequence}
              className="flex items-center gap-3 bg-card/50 border rounded-xl px-4 py-3"
            >
              <div className="size-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                {r.sequence}
              </div>
              <div className="flex-1 text-sm text-muted-foreground">
                {r.distanceM != null ? formatDistance(r.distanceM) : "—"} od celu
              </div>
              <span className={cn("font-semibold tabular-nums", scoreColor(r.score ?? 0))}>
                {(r.score ?? 0).toLocaleString("pl-PL")}
              </span>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-2 pt-2">
          <ShareButton url={shareUrl} score={round.totalScore ?? 0} />
          <Button asChild variant="brand" size="lg">
            <Link href="/play">
              Zagraj sam
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <Button asChild variant="ghost" size="sm" className="mx-auto">
          <Link href="/leaderboard">
            <Trophy />
            Zobacz ranking
          </Link>
        </Button>
      </div>
    </main>
  );
}
