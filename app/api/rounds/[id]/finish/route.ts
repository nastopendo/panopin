import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { guesses, rounds, tournamentPlayers, tournaments } from "@/lib/db/schema";
import { and, count, eq, isNotNull, isNull, lt, ne, sum } from "drizzle-orm";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roundId } = await params;

  const [round] = await db
    .select({ id: rounds.id, completedAt: rounds.completedAt })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);

  if (!round) return NextResponse.json({ error: "round not found" }, { status: 404 });
  if (round.completedAt) return NextResponse.json({ error: "already finished" }, { status: 409 });

  const [agg] = await db
    .select({ total: sum(guesses.score) })
    .from(guesses)
    .where(eq(guesses.roundId, roundId));

  const totalScore = Number(agg?.total ?? 0);

  await db
    .update(rounds)
    .set({ totalScore, completedAt: new Date() })
    .where(eq(rounds.id, roundId));

  // How many completed rounds (excluding this one) have a lower score
  const [{ beaten }] = await db
    .select({ beaten: count() })
    .from(rounds)
    .where(and(isNotNull(rounds.totalScore), ne(rounds.id, roundId), lt(rounds.totalScore, totalScore)));

  const [{ total }] = await db
    .select({ total: count() })
    .from(rounds)
    .where(and(isNotNull(rounds.totalScore), ne(rounds.id, roundId)));

  const topPercent =
    Number(total) > 0
      ? Math.max(1, Math.ceil((1 - Number(beaten) / Number(total)) * 100))
      : null;

  // If this round is part of a tournament, mark player finished + auto-finish if last
  const [tplayer] = await db
    .select({
      id: tournamentPlayers.id,
      tournamentId: tournamentPlayers.tournamentId,
    })
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.roundId, roundId))
    .limit(1);

  if (tplayer) {
    await db
      .update(tournamentPlayers)
      .set({ finishedAt: new Date(), currentScore: totalScore })
      .where(eq(tournamentPlayers.id, tplayer.id));

    const [{ value: unfinishedCount }] = await db
      .select({ value: count() })
      .from(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, tplayer.tournamentId),
          isNull(tournamentPlayers.finishedAt),
        ),
      );

    if (Number(unfinishedCount) === 0) {
      await db
        .update(tournaments)
        .set({ status: "finished", finishedAt: new Date() })
        .where(eq(tournaments.id, tplayer.tournamentId));
    }
  }

  return NextResponse.json({ totalScore, topPercent });
}
