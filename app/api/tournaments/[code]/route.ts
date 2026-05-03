import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { tournamentPlayers, tournaments } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { isValidTournamentCode, normalizeTournamentCode } from "@/lib/tournaments";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = normalizeTournamentCode(rawCode);
  if (!isValidTournamentCode(code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.code, code))
    .limit(1);

  if (!tournament) {
    return NextResponse.json({ error: "tournament not found" }, { status: 404 });
  }

  const players = await db
    .select({
      id: tournamentPlayers.id,
      userId: tournamentPlayers.userId,
      displayName: tournamentPlayers.displayName,
      isHost: tournamentPlayers.isHost,
      currentScore: tournamentPlayers.currentScore,
      finishedAt: tournamentPlayers.finishedAt,
      roundId: tournamentPlayers.roundId,
      joinedAt: tournamentPlayers.joinedAt,
    })
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, tournament.id))
    .orderBy(asc(tournamentPlayers.joinedAt));

  return NextResponse.json({
    id: tournament.id,
    code: tournament.code,
    status: tournament.status,
    hostId: tournament.hostId,
    filterDifficulties: tournament.filterDifficulties,
    filterTagIds: tournament.filterTagIds,
    startedAt: tournament.startedAt,
    finishedAt: tournament.finishedAt,
    nextTournamentCode: tournament.nextTournamentCode,
    createdAt: tournament.createdAt,
    players,
  });
}
