import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { photoTags, photos, rounds } from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";

const startSchema = z.object({
  filterDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
  filterTagIds: z.array(z.string().uuid()).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();

  const body = await req.json().catch(() => ({}));
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { filterDifficulty, filterTagIds } = parsed.data;

  // Build WHERE conditions
  const conditions = [eq(photos.status, "published")];
  if (filterDifficulty) conditions.push(eq(photos.difficulty, filterDifficulty));

  let tagSubquery: ReturnType<typeof inArray> | undefined;
  if (filterTagIds && filterTagIds.length > 0) {
    tagSubquery = inArray(
      photos.id,
      db
        .select({ id: photoTags.photoId })
        .from(photoTags)
        .where(inArray(photoTags.tagId, filterTagIds)),
    );
    conditions.push(tagSubquery);
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
    .limit(5);

  if (selected.length < 5) {
    const filterDesc =
      filterDifficulty || (filterTagIds && filterTagIds.length > 0)
        ? " z wybranymi filtrami"
        : "";
    return NextResponse.json(
      { error: `Brak wystarczającej liczby zdjęć${filterDesc} (potrzeba co najmniej 5)` },
      { status: 422 },
    );
  }

  const photoIds = selected.map((p) => p.id);

  const [round] = await db
    .insert(rounds)
    .values({
      userId: user?.id ?? null,
      photoIds,
      filterDifficulty: filterDifficulty ?? null,
      filterTagIds: filterTagIds ?? null,
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
