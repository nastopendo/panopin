import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { photoTags, photos, rounds } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import { selectPhotos } from "@/lib/photo-selection";

const startSchema = z.object({
  filterDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
  filterTagIds: z.array(z.string().uuid()).optional(),
});

const SPACING_MESSAGES: Record<string, string> = {
  insufficient_photos:
    "Brak wystarczającej liczby zdjęć z wybranymi filtrami (potrzeba co najmniej 5)",
  spacing_not_satisfied:
    "Nie udało się dobrać 5 zdjęć spełniających minimalną odległość między lokalizacjami. Spróbuj zmienić filtry lub zmniejsz minimalną odległość w ustawieniach.",
};

export async function POST(req: Request) {
  const user = await getCurrentUser();

  const body = await req.json().catch(() => ({}));
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { filterDifficulty, filterTagIds } = parsed.data;

  const conditions = [eq(photos.status, "published")];
  if (filterDifficulty) conditions.push(eq(photos.difficulty, filterDifficulty));

  if (filterTagIds && filterTagIds.length > 0) {
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

  const result = await selectPhotos(conditions, 5);

  if ("error" in result) {
    return NextResponse.json(
      { error: SPACING_MESSAGES[result.error] ?? result.error },
      { status: result.status },
    );
  }

  const selected = result;
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
