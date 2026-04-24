import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { photos, rounds } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [round] = await db
    .select({ id: rounds.id, photoIds: rounds.photoIds, completedAt: rounds.completedAt })
    .from(rounds)
    .where(eq(rounds.id, id))
    .limit(1);

  if (!round) return NextResponse.json({ error: "not found" }, { status: 404 });

  const selected = await db
    .select({
      id: photos.id,
      tileBaseUrl: photos.tileBaseUrl,
      heading: photos.heading,
      tileManifest: photos.tileManifest,
    })
    .from(photos)
    .where(inArray(photos.id, round.photoIds));

  // Preserve original order
  const byId = Object.fromEntries(selected.map((p) => [p.id, p]));
  const roundPhotos = round.photoIds.map((pid) => {
    const p = byId[pid];
    return {
      photoId: p.id,
      tileBaseUrl: p.tileBaseUrl ?? "",
      heading: p.heading,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tileLevels: (p.tileManifest as any)?.levels ?? [],
    };
  });

  return NextResponse.json({
    roundId: round.id,
    completedAt: round.completedAt,
    photos: roundPhotos,
  });
}
