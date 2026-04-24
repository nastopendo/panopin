import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { guesses, rounds } from "@/lib/db/schema";
import { eq, sum } from "drizzle-orm";

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

  return NextResponse.json({ totalScore });
}
