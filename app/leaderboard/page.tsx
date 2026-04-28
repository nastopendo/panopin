import Link from "next/link";
import { ArrowLeft, ArrowRight, Crown, Medal, Trophy } from "lucide-react";
import { db } from "@/lib/db/client";
import { rounds, profiles } from "@/lib/db/schema";
import { desc, eq, isNotNull } from "drizzle-orm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function rankColor(rank: number) {
  if (rank === 1) return "text-warning";
  if (rank === 2) return "text-muted-foreground";
  if (rank === 3) return "text-brand";
  return "text-muted-foreground/60";
}

export default async function LeaderboardPage() {
  const rows = await db
    .select({
      id: rounds.id,
      totalScore: rounds.totalScore,
      completedAt: rounds.completedAt,
      displayName: profiles.displayName,
    })
    .from(rounds)
    .leftJoin(profiles, eq(rounds.userId, profiles.id))
    .where(isNotNull(rounds.totalScore))
    .orderBy(desc(rounds.totalScore))
    .limit(20);

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <main className="bg-aurora min-h-dvh">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between">
        <Logo size="md" />
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft />
            <span className="hidden sm:inline">Strona główna</span>
          </Link>
        </Button>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Trophy className="size-3 text-brand" />
            Najlepsze wyniki
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Ranking</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Top 20 wyników wszech czasów. Zagraj i pobij rekord.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border bg-card/40 backdrop-blur">
            <Trophy className="size-10 text-muted-foreground/40 mx-auto mb-4" strokeWidth={1.4} />
            <p className="text-muted-foreground mb-6">Brak wyników. Zagraj jako pierwszy!</p>
            <Button asChild variant="brand">
              <Link href="/play">
                Zagraj
                <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Podium */}
            {podium.length > 0 && (
              <div className="grid sm:grid-cols-3 gap-3">
                {podium.map((row, i) => (
                  <PodiumCard
                    key={row.id}
                    rank={i + 1}
                    name={row.displayName}
                    score={row.totalScore ?? 0}
                    completedAt={row.completedAt}
                  />
                ))}
              </div>
            )}

            {/* Rest */}
            {rest.length > 0 && (
              <ol className="space-y-1.5 mt-6">
                {rest.map((row, i) => {
                  const rank = i + 4;
                  return (
                    <li
                      key={row.id}
                      className="flex items-center gap-4 bg-card/50 border rounded-xl px-4 py-3 backdrop-blur transition-colors hover:bg-card/70"
                    >
                      <span
                        className={cn(
                          "tabular-nums font-bold text-sm w-8 text-center shrink-0",
                          rankColor(rank),
                        )}
                      >
                        #{rank}
                      </span>
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(row.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm truncate">
                        {row.displayName ?? (
                          <span className="text-muted-foreground italic">Anonim</span>
                        )}
                      </span>
                      <div className="text-right shrink-0">
                        <div className="font-semibold tabular-nums text-sm">
                          {row.totalScore?.toLocaleString("pl-PL")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.completedAt
                            ? new Date(row.completedAt).toLocaleDateString("pl-PL")
                            : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-10 flex justify-center">
            <Button asChild variant="brand" size="lg">
              <Link href="/play">
                Zagraj i pobij rekord
                <ArrowRight />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

function PodiumCard({
  rank,
  name,
  score,
  completedAt,
}: {
  rank: number;
  name: string | null;
  score: number;
  completedAt: Date | null;
}) {
  const Icon = rank === 1 ? Crown : Medal;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 backdrop-blur-md flex flex-col items-center text-center gap-2",
        rank === 1
          ? "bg-warning/10 border-warning/30 sm:order-2 sm:scale-105"
          : rank === 2
            ? "bg-card/60 border-border sm:order-1"
            : "bg-brand/10 border-brand/25 sm:order-3",
      )}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider",
          rankColor(rank),
        )}
      >
        <Icon className="size-3.5" />#{rank}
      </div>
      <Avatar className="size-12">
        <AvatarFallback className="text-sm">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="text-sm font-medium truncate max-w-full">
        {name ?? <span className="text-muted-foreground italic">Anonim</span>}
      </div>
      <div className="text-xl font-bold tabular-nums">
        {score.toLocaleString("pl-PL")}
      </div>
      <div className="text-[10px] text-muted-foreground">
        {completedAt ? new Date(completedAt).toLocaleDateString("pl-PL") : ""}
      </div>
    </div>
  );
}
