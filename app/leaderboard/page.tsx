import Link from "next/link";
import { db } from "@/lib/db/client";
import { rounds, profiles } from "@/lib/db/schema";
import { desc, eq, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Ranking</h1>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
            ← Strona główna
          </Link>
        </div>

        {rows.length === 0 ? (
          <p className="text-zinc-500 text-center py-12">
            Brak wyników. Zagraj jako pierwszy!
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div
                key={row.id}
                className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4"
              >
                <div
                  className={`w-8 text-center font-bold text-sm shrink-0 ${
                    i === 0
                      ? "text-yellow-400"
                      : i === 1
                        ? "text-zinc-300"
                        : i === 2
                          ? "text-amber-600"
                          : "text-zinc-600"
                  }`}
                >
                  #{i + 1}
                </div>
                <div className="flex-1 text-sm truncate">
                  {row.displayName ?? (
                    <span className="text-zinc-500 italic">Anonim</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold">
                    {row.totalScore?.toLocaleString("pl")} pkt
                  </div>
                  <div className="text-xs text-zinc-600">
                    {row.completedAt
                      ? new Date(row.completedAt).toLocaleDateString("pl-PL")
                      : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/play"
            className="px-6 py-3 bg-white text-zinc-900 rounded-xl font-semibold hover:bg-zinc-100 transition-colors"
          >
            Zagraj i pobij rekord
          </Link>
        </div>
      </div>
    </div>
  );
}
