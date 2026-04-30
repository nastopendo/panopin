import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { guesses, photos, rounds, scoringSettings, tournamentPlayers } from "@/lib/db/schema";
import { eq, and, sum, inArray } from "drizzle-orm";
import { scoreGuess, DEFAULT_SCORING_CONFIG, type ScoringConfig } from "@/lib/scoring";

// ─── GET — guesses for a completed round (public, no auth needed) ─────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roundId } = await params;

  const [round] = await db
    .select({ id: rounds.id, completedAt: rounds.completedAt, photoIds: rounds.photoIds })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);

  if (!round) return NextResponse.json({ error: "round not found" }, { status: 404 });
  if (!round.completedAt) {
    return NextResponse.json({ error: "round not finished" }, { status: 403 });
  }

  const roundGuesses = await db
    .select({
      sequence: guesses.sequence,
      guessLat: guesses.guessLat,
      guessLng: guesses.guessLng,
      actualLat: guesses.actualLat,
      actualLng: guesses.actualLng,
      distanceM: guesses.distanceM,
      score: guesses.score,
    })
    .from(guesses)
    .where(eq(guesses.roundId, roundId))
    .orderBy(guesses.sequence);

  const photoIds = round.photoIds as string[];
  const photoRows = await db
    .select({
      id: photos.id,
      tileBaseUrl: photos.tileBaseUrl,
      heading: photos.heading,
      tileManifest: photos.tileManifest,
    })
    .from(photos)
    .where(inArray(photos.id, photoIds));

  const photoMap = new Map(photoRows.map((p) => [p.id, p]));
  const orderedPhotos = photoIds
    .map((id) => photoMap.get(id))
    .filter(Boolean)
    .map((p) => ({
      photoId: p!.id,
      tileBaseUrl: p!.tileBaseUrl ?? "",
      heading: p!.heading,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tileLevels: (p!.tileManifest as any)?.levels ?? [],
    }));

  return NextResponse.json({ guesses: roundGuesses, photos: orderedPhotos });
}

// ─── POST — submit a guess ────────────────────────────────────────────────────

const BodySchema = z.object({
  photoId: z.string().uuid(),
  sequenceNumber: z.number().int().min(1).max(5),
  guessLat: z.number().min(-90).max(90),
  guessLng: z.number().min(-180).max(180),
  elapsedMs: z.number().int().min(0),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roundId } = await params;

  const json = await req.json();
  const parse = BodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: "invalid body", details: parse.error }, { status: 400 });
  }

  const { photoId, sequenceNumber, guessLat, guessLng, elapsedMs } = parse.data;

  const [round] = await db
    .select({ id: rounds.id, photoIds: rounds.photoIds, completedAt: rounds.completedAt })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);

  if (!round) return NextResponse.json({ error: "round not found" }, { status: 404 });
  if (round.completedAt) return NextResponse.json({ error: "round already finished" }, { status: 409 });

  const expectedPhotoId = round.photoIds[sequenceNumber - 1];
  if (expectedPhotoId !== photoId) {
    return NextResponse.json({ error: "photo not in round at given sequence" }, { status: 422 });
  }

  const [existing] = await db
    .select({ id: guesses.id })
    .from(guesses)
    .where(and(eq(guesses.roundId, roundId), eq(guesses.sequence, sequenceNumber)))
    .limit(1);

  if (existing) return NextResponse.json({ error: "already submitted" }, { status: 409 });

  const [photo] = await db
    .select({ lat: photos.lat, lng: photos.lng, difficulty: photos.difficulty })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);

  if (!photo) return NextResponse.json({ error: "photo not found" }, { status: 404 });

  const [scoringRow] = await db
    .select()
    .from(scoringSettings)
    .where(eq(scoringSettings.id, 1))
    .limit(1);

  const config: ScoringConfig = scoringRow
    ? {
        maxDistanceM: scoringRow.maxDistanceM,
        timeLimitMs: scoringRow.timeLimitS * 1000,
        maxBaseScore: scoringRow.maxBaseScore,
        maxTimeBonus: scoringRow.maxTimeBonus,
        scaleM: {
          easy: scoringRow.scaleEasyM,
          medium: scoringRow.scaleMediumM,
          hard: scoringRow.scaleHardM,
          extreme: scoringRow.scaleExtremeM,
        },
        mult: {
          easy: scoringRow.multEasy,
          medium: scoringRow.multMedium,
          hard: scoringRow.multHard,
          extreme: scoringRow.multExtreme,
        },
      }
    : DEFAULT_SCORING_CONFIG;

  const result = scoreGuess(
    {
      guessLat,
      guessLng,
      actualLat: photo.lat,
      actualLng: photo.lng,
      difficulty: photo.difficulty,
      elapsedMs,
    },
    config,
  );

  await db.insert(guesses).values({
    roundId,
    photoId,
    sequence: sequenceNumber,
    guessLat,
    guessLng,
    distanceM: result.distanceM,
    timeSpentMs: elapsedMs,
    score: result.total,
    actualLat: photo.lat,
    actualLng: photo.lng,
  });

  // If this round belongs to a tournament, push live score
  const [tplayer] = await db
    .select({ id: tournamentPlayers.id })
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.roundId, roundId))
    .limit(1);

  if (tplayer) {
    const [agg] = await db
      .select({ total: sum(guesses.score) })
      .from(guesses)
      .where(eq(guesses.roundId, roundId));

    await db
      .update(tournamentPlayers)
      .set({ currentScore: Number(agg?.total ?? 0) })
      .where(eq(tournamentPlayers.id, tplayer.id));
  }

  return NextResponse.json({
    distanceM: result.distanceM,
    score: result.total,
    baseScore: result.baseScore,
    timeBonus: result.timeBonus,
    actualLat: photo.lat,
    actualLng: photo.lng,
  });
}
