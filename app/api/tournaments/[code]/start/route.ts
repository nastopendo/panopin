import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import {
  photoTags,
  photos,
  rounds,
  tournamentPlayers,
  tournaments,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import {
  TOURNAMENT_PHOTOS_PER_GAME,
  isValidTournamentCode,
  normalizeTournamentCode,
} from "@/lib/tournaments";
import { selectPhotos } from "@/lib/photo-selection";

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

  type DifficultyValue = "easy" | "medium" | "hard" | "extreme";
  const DEFAULT_DIFFICULTIES: DifficultyValue[] = ["easy", "medium", "hard"];
  const difficulties: DifficultyValue[] =
    (tournament.filterDifficulties as DifficultyValue[] | null) ?? DEFAULT_DIFFICULTIES;

  const conditions = [
    eq(photos.status, "published"),
    inArray(photos.difficulty, difficulties),
  ];
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

  const selectionResult = await selectPhotos(conditions, TOURNAMENT_PHOTOS_PER_GAME);

  if ("error" in selectionResult) {
    const msg =
      selectionResult.error === "spacing_not_satisfied"
        ? `Nie udało się dobrać ${TOURNAMENT_PHOTOS_PER_GAME} zdjęć spełniających minimalną odległość między lokalizacjami. Zmień filtry lub zmniejsz minimalną odległość w ustawieniach.`
        : `Brak wystarczającej liczby zdjęć z wybranymi filtrami (potrzeba co najmniej ${TOURNAMENT_PHOTOS_PER_GAME})`;
    return NextResponse.json({ error: msg }, { status: selectionResult.status });
  }

  const selected = selectionResult;
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
