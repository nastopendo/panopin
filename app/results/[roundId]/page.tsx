import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db/client";
import { guesses, profiles, rounds } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ShareButton } from "@/components/ShareButton";

// ─── Metadata (OG tags) ───────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ roundId: string }> },
): Promise<Metadata> {
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
    title: `Panopin — ${score} pkt`,
    description: `Sprawdź czy pobijest mój wynik ${score} punktów z 5 lokalizacji!`,
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ResultsPage(
  { params }: { params: Promise<{ roundId: string }> },
) {
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-10 flex flex-col gap-6">
        {/* Score header */}
        <div className="text-center">
          <div className="text-sm text-zinc-500 mb-1 font-medium">
            {displayName ?? "Anonimowy gracz"}
          </div>
          <div className="text-6xl font-bold tracking-tight">
            {round.totalScore?.toLocaleString("pl-PL")}
          </div>
          <div className="text-zinc-400 text-sm mt-1">punktów z 5 lokalizacji</div>
        </div>

        {/* Step results */}
        <div className="space-y-2">
          {stepResults.map((r) => (
            <div
              key={r.sequence}
              className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
            >
              <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">
                {r.sequence}
              </div>
              <div className="flex-1 text-sm text-zinc-400">
                {r.distanceM != null ? formatDistance(r.distanceM) : "—"} od celu
              </div>
              <span className={`font-semibold ${scoreColor(r.score ?? 0)}`}>
                {(r.score ?? 0).toLocaleString("pl-PL")} pkt
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <ShareButton
            url={shareUrl}
            score={round.totalScore ?? 0}
          />
          <Link
            href="/play"
            className="w-full text-center px-6 py-3 bg-white text-zinc-900 rounded-xl font-semibold hover:bg-zinc-100 transition-colors"
          >
            Zagraj sam!
          </Link>
          <Link
            href="/"
            className="w-full text-center px-6 py-3 border border-zinc-800 text-zinc-500 rounded-xl hover:border-zinc-600 transition-colors text-sm"
          >
            Strona główna
          </Link>
        </div>
      </div>
    </div>
  );
}
