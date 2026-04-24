import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { photos, rounds } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";

export async function POST() {
  const user = await getCurrentUser();

  // Pick 5 random published photos
  const selected = await db
    .select({
      id: photos.id,
      tileBaseUrl: photos.tileBaseUrl,
      heading: photos.heading,
      tileManifest: photos.tileManifest,
    })
    .from(photos)
    .where(eq(photos.status, "published"))
    .orderBy(sql`random()`)
    .limit(5);

  if (selected.length < 5) {
    return NextResponse.json(
      { error: "Not enough published photos (need at least 5)" },
      { status: 422 },
    );
  }

  const photoIds = selected.map((p) => p.id);

  const [round] = await db
    .insert(rounds)
    .values({
      userId: user?.id ?? null,
      photoIds,
    })
    .returning({ id: rounds.id });

  const roundPhotos = selected.map((p) => ({
    photoId: p.id,
    tileBaseUrl: p.tileBaseUrl ?? "",
    heading: p.heading,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tileLevels: (p.tileManifest as any)?.levels ?? [],
  }));

  return NextResponse.json({ roundId: round.id, photos: roundPhotos });
}
