import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { tournamentPlayers, tournaments } from "@/lib/db/schema";
import { and, count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import {
  TOURNAMENT_DISPLAY_NAME_MAX,
  TOURNAMENT_DISPLAY_NAME_MIN,
  TOURNAMENT_PLAYER_LIMIT,
  isValidTournamentCode,
  normalizeTournamentCode,
} from "@/lib/tournaments";

const BodySchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(TOURNAMENT_DISPLAY_NAME_MIN)
    .max(TOURNAMENT_DISPLAY_NAME_MAX),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const { code: rawCode } = await params;
  const code = normalizeTournamentCode(rawCode);
  if (!isValidTournamentCode(code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { displayName } = parsed.data;

  const [tournament] = await db
    .select({
      id: tournaments.id,
      status: tournaments.status,
    })
    .from(tournaments)
    .where(eq(tournaments.code, code))
    .limit(1);

  if (!tournament) {
    return NextResponse.json({ error: "tournament not found" }, { status: 404 });
  }

  // Check if already a player — idempotent rejoin
  const [existing] = await db
    .select({ id: tournamentPlayers.id })
    .from(tournamentPlayers)
    .where(
      and(
        eq(tournamentPlayers.tournamentId, tournament.id),
        eq(tournamentPlayers.userId, user.id),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({
      ok: true,
      tournamentId: tournament.id,
      playerId: existing.id,
      rejoined: true,
    });
  }

  if (tournament.status !== "lobby") {
    return NextResponse.json(
      { error: "tournament already started" },
      { status: 409 },
    );
  }

  const [{ value: playerCount }] = await db
    .select({ value: count() })
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, tournament.id));

  if (Number(playerCount) >= TOURNAMENT_PLAYER_LIMIT) {
    return NextResponse.json(
      { error: `tournament is full (limit ${TOURNAMENT_PLAYER_LIMIT})` },
      { status: 409 },
    );
  }

  const [player] = await db
    .insert(tournamentPlayers)
    .values({
      tournamentId: tournament.id,
      userId: user.id,
      displayName,
      isHost: false,
    })
    .returning({ id: tournamentPlayers.id });

  return NextResponse.json({
    ok: true,
    tournamentId: tournament.id,
    playerId: player.id,
  });
}
