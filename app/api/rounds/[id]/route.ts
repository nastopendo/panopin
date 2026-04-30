import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { photos, photoTags, rounds, tags } from "@/lib/db/schema";
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

  const [selected, tagRows] = await Promise.all([
    db
      .select({
        id: photos.id,
        tileBaseUrl: photos.tileBaseUrl,
        heading: photos.heading,
        tileManifest: photos.tileManifest,
      })
      .from(photos)
      .where(inArray(photos.id, round.photoIds)),

    db
      .select({
        photoId: photoTags.photoId,
        tagId: tags.id,
        tagName: tags.name,
        tagColor: tags.color,
      })
      .from(photoTags)
      .innerJoin(tags, eq(photoTags.tagId, tags.id))
      .where(inArray(photoTags.photoId, round.photoIds)),
  ]);

  const tagsByPhotoId = tagRows.reduce<Record<string, { id: string; name: string; color: string }[]>>(
    (acc, row) => {
      (acc[row.photoId] ??= []).push({ id: row.tagId, name: row.tagName, color: row.tagColor });
      return acc;
    },
    {},
  );

  const byId = Object.fromEntries(selected.map((p) => [p.id, p]));
  const roundPhotos = round.photoIds.map((pid) => {
    const p = byId[pid];
    return {
      photoId: p.id,
      tileBaseUrl: p.tileBaseUrl ?? "",
      heading: p.heading,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tileLevels: (p.tileManifest as any)?.levels ?? [],
      tags: tagsByPhotoId[pid] ?? [],
    };
  });

  return NextResponse.json({
    roundId: round.id,
    completedAt: round.completedAt,
    photos: roundPhotos,
  });
}
