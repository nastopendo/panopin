import { db } from "@/lib/db/client";
import { photos, scoringSettings } from "@/lib/db/schema";
import { and, eq, SQL, sql } from "drizzle-orm";
import { haversineMeters } from "@/lib/geo";

const CANDIDATE_LIMIT = 200;

interface SelectedPhoto {
  id: string;
  lat: number;
  lng: number;
  tileBaseUrl: string | null;
  heading: number;
  tileManifest: unknown;
}

export async function selectPhotos(
  conditions: SQL[],
  count: number,
): Promise<SelectedPhoto[] | { error: string; status: number }> {
  const [settingsRow] = await db
    .select({ minSpacingM: scoringSettings.minSpacingM })
    .from(scoringSettings)
    .where(eq(scoringSettings.id, 1))
    .limit(1);

  const minSpacingM = settingsRow?.minSpacingM ?? 0;

  const candidates = await db
    .select({
      id: photos.id,
      lat: photos.lat,
      lng: photos.lng,
      tileBaseUrl: photos.tileBaseUrl,
      heading: photos.heading,
      tileManifest: photos.tileManifest,
    })
    .from(photos)
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(CANDIDATE_LIMIT);

  if (candidates.length < count) {
    return { error: "insufficient_photos", status: 422 };
  }

  if (minSpacingM <= 0) {
    return candidates.slice(0, count);
  }

  const selected: SelectedPhoto[] = [];
  for (const candidate of candidates) {
    const tooClose = selected.some(
      (s) => haversineMeters(s.lat, s.lng, candidate.lat, candidate.lng) < minSpacingM,
    );
    if (!tooClose) {
      selected.push(candidate);
      if (selected.length === count) return selected;
    }
  }

  return { error: "spacing_not_satisfied", status: 422 };
}
