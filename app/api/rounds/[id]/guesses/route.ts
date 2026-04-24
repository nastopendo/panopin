import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { guesses, photos, rounds } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { scoreGuess } from "@/lib/scoring";

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

  // Verify round exists and is open
  const [round] = await db
    .select({ id: rounds.id, photoIds: rounds.photoIds, completedAt: rounds.completedAt })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);

  if (!round) return NextResponse.json({ error: "round not found" }, { status: 404 });
  if (round.completedAt) return NextResponse.json({ error: "round already finished" }, { status: 409 });

  // Verify the photo belongs to this round at the correct sequence
  const expectedPhotoId = round.photoIds[sequenceNumber - 1];
  if (expectedPhotoId !== photoId) {
    return NextResponse.json({ error: "photo not in round at given sequence" }, { status: 422 });
  }

  // Check this sequence hasn't been submitted already
  const [existing] = await db
    .select({ id: guesses.id })
    .from(guesses)
    .where(and(eq(guesses.roundId, roundId), eq(guesses.sequence, sequenceNumber)))
    .limit(1);

  if (existing) return NextResponse.json({ error: "already submitted" }, { status: 409 });

  // Fetch photo location + difficulty
  const [photo] = await db
    .select({ lat: photos.lat, lng: photos.lng, difficulty: photos.difficulty })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);

  if (!photo) return NextResponse.json({ error: "photo not found" }, { status: 404 });

  // Server-side scoring
  const result = scoreGuess({
    guessLat,
    guessLng,
    actualLat: photo.lat,
    actualLng: photo.lng,
    difficulty: photo.difficulty,
    elapsedMs,
  });

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

  return NextResponse.json({
    distanceM: result.distanceM,
    score: result.total,
    baseScore: result.baseScore,
    timeBonus: result.timeBonus,
    actualLat: photo.lat,
    actualLng: photo.lng,
  });
}
