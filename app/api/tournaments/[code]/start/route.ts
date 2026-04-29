import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import {
  photoTags,
  photos,
  rounds,
  tournamentPlayers,
  tournaments,
} from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import {
  TOURNAMENT_PHOTOS_PER_GAME,
  isValidTournamentCode,
  normalizeTournamentCode,
} from "@/lib/tournaments";

export async function POST(
  _req: Request,
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

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.code, code))
    .limit(1);

  if (!tournament) {
    return NextResponse.json({ error: "tournament not found" }, { status: 404 });
  }

  if (tournament.hostId !== user.id) {
    return NextResponse.json({ error: "only host can start" }, { status: 403 });
  }

  // Idempotent: already started → return current state, no-op
  if (tournament.status !== "lobby") {
    return NextResponse.json({
      ok: true,
      alreadyStarted: true,
      status: tournament.status,
    });
  }

  // Pick 5 random photos with the tournament's filters
  const conditions = [eq(photos.status, "published")];
  if (tournament.filterDifficulty) {
    conditions.push(eq(photos.difficulty, tournament.filterDifficulty));
  }
  const filterTagIds = (tournament.filterTagIds ?? []) as string[];
  if (filterTagIds.length > 0) {
    conditions.push(
      inArray(
        photos.id,
        db
          .select({ id: photoTags.photoId })
          .from(photoTags)
          .where(inArray(photoTags.tagId, filterTagIds)),
      ),
    );
  }

  const selected = await db
    .select({
      id: photos.id,
      tileBaseUrl: photos.tileBaseUrl,
      heading: photos.heading,
      tileManifest: photos.tileManifest,
    })
    .from(photos)
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(TOURNAMENT_PHOTOS_PER_GAME);

  if (selected.length < TOURNAMENT_PHOTOS_PER_GAME) {
    return NextResponse.json(
      {
        error: `Brak wystarczającej liczby zdjęć z wybranymi filtrami (potrzeba co najmniej ${TOURNAMENT_PHOTOS_PER_GAME})`,
      },
      { status: 422 },
    );
  }

  const photoIds = selected.map((p) => p.id);

  const players = await db
    .select({
      id: tournamentPlayers.id,
      userId: tournamentPlayers.userId,
    })
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, tournament.id));

  if (players.length === 0) {
    return NextResponse.json(
      { error: "no players in tournament" },
      { status: 422 },
    );
  }

  // Create a round per player + link to tournament_players + flip status
  await db.transaction(async (tx) => {
    for (const p of players) {
      const [round] = await tx
        .insert(rounds)
        .values({
          userId: p.userId,
          photoIds,
          filterDifficulty: tournament.filterDifficulty ?? null,
          filterTagIds: tournament.filterTagIds ?? null,
        })
        .returning({ id: rounds.id });

      await tx
        .update(tournamentPlayers)
        .set({ roundId: round.id })
        .where(eq(tournamentPlayers.id, p.id));
    }

    await tx
      .update(tournaments)
      .set({
        status: "playing",
        photoIds,
        startedAt: new Date(),
      })
      .where(eq(tournaments.id, tournament.id));
  });

  return NextResponse.json({ ok: true });
}
