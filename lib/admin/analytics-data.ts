import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export interface RoundPerDay {
  day: string;
  count: number;
}

export interface ScoreBucket {
  bucket: number;
  count: number;
}

export interface TopPhoto {
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  guessCount: number;
  avgScore: number | null;
}

export interface TagStat {
  id: string;
  name: string;
  color: string;
  photoCount: number;
}

export interface AnalyticsData {
  totalRounds: number;
  completedRounds: number;
  totalGuesses: number;
  totalPhotos: number;
  totalPlayers: number;
  avgScore: number;
  active7: number;
  returningPlayers: number;
  totalTournaments: number;
  roundsPerDay: RoundPerDay[];
  scoreDist: ScoreBucket[];
  topPhotos: TopPhoto[];
  tagStats: TagStat[];
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Fetch all analytics data. Queries run sequentially to avoid pool/pgBouncer
// contention with 13 parallel queries (which previously deadlocked the
// transaction pooler). Total time stays well under 2 s on a warm connection.
export async function fetchAnalytics(): Promise<AnalyticsData> {
  const kpiRows = (await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM rounds) AS "totalRounds",
      (SELECT COUNT(*)::int FROM rounds WHERE completed_at IS NOT NULL) AS "completedRounds",
      (SELECT COUNT(*)::int FROM guesses) AS "totalGuesses",
      (SELECT COUNT(*)::int FROM photos WHERE status = 'published') AS "totalPhotos",
      (SELECT COUNT(*)::int FROM profiles WHERE role = 'player') AS "totalPlayers",
      (SELECT COALESCE(ROUND(AVG(total_score))::int, 0) FROM rounds WHERE total_score IS NOT NULL) AS "avgScore",
      (SELECT COUNT(DISTINCT COALESCE(user_id::text, anon_session_id))::int
         FROM rounds WHERE started_at >= NOW() - INTERVAL '7 days') AS "active7",
      (SELECT COUNT(*)::int FROM (
         SELECT COALESCE(user_id::text, anon_session_id) AS pid
         FROM rounds
         WHERE user_id IS NOT NULL OR anon_session_id IS NOT NULL
         GROUP BY pid HAVING COUNT(*) > 1
       ) t) AS "returningPlayers",
      (SELECT COUNT(*)::int FROM tournaments) AS "totalTournaments"
  `)) as unknown as Array<Record<string, unknown>>;

  const kpi = kpiRows[0] ?? {};

  const roundsPerDayRaw = (await db.execute(sql`
    SELECT DATE_TRUNC('day', started_at)::date::text AS day,
           COUNT(*)::int AS count
    FROM rounds
    WHERE started_at >= NOW() - INTERVAL '30 days'
    GROUP BY day
    ORDER BY day ASC
  `)) as unknown as Array<{ day: string; count: number }>;

  const scoreDistRaw = (await db.execute(sql`
    SELECT FLOOR(total_score / 5000)::int AS bucket,
           COUNT(*)::int AS count
    FROM rounds
    WHERE total_score IS NOT NULL
    GROUP BY bucket
    ORDER BY bucket
  `)) as unknown as Array<{ bucket: number; count: number }>;

  const topPhotosRaw = (await db.execute(sql`
    SELECT p.id,
           p.title,
           p.thumbnail_url AS "thumbnailUrl",
           COUNT(g.id)::int AS "guessCount",
           CASE WHEN COUNT(g.id) > 0 THEN ROUND(AVG(g.score))::int ELSE NULL END AS "avgScore"
    FROM photos p
    LEFT JOIN guesses g ON g.photo_id = p.id
    WHERE p.status = 'published'
    GROUP BY p.id, p.title, p.thumbnail_url
    ORDER BY "guessCount" DESC NULLS LAST, p.created_at DESC
    LIMIT 10
  `)) as unknown as Array<{
    id: string;
    title: string | null;
    thumbnailUrl: string | null;
    guessCount: number | null;
    avgScore: number | null;
  }>;

  const tagStatsRaw = (await db.execute(sql`
    SELECT t.id,
           t.name,
           t.color,
           COUNT(DISTINCT pt.photo_id)::int AS "photoCount"
    FROM tags t
    LEFT JOIN photo_tags pt ON pt.tag_id = t.id
    GROUP BY t.id, t.name, t.color
    ORDER BY "photoCount" DESC
  `)) as unknown as Array<{
    id: string;
    name: string;
    color: string;
    photoCount: number | null;
  }>;

  return {
    totalRounds: num(kpi.totalRounds),
    completedRounds: num(kpi.completedRounds),
    totalGuesses: num(kpi.totalGuesses),
    totalPhotos: num(kpi.totalPhotos),
    totalPlayers: num(kpi.totalPlayers),
    avgScore: num(kpi.avgScore),
    active7: num(kpi.active7),
    returningPlayers: num(kpi.returningPlayers),
    totalTournaments: num(kpi.totalTournaments),
    roundsPerDay: [...roundsPerDayRaw].map((r) => ({
      day: String(r.day),
      count: num(r.count),
    })),
    scoreDist: [...scoreDistRaw].map((r) => ({
      bucket: num(r.bucket),
      count: num(r.count),
    })),
    topPhotos: [...topPhotosRaw].map((r) => ({
      id: String(r.id),
      title: r.title,
      thumbnailUrl: r.thumbnailUrl,
      guessCount: num(r.guessCount),
      avgScore: r.avgScore == null ? null : num(r.avgScore),
    })),
    tagStats: [...tagStatsRaw].map((r) => ({
      id: String(r.id),
      name: String(r.name),
      color: String(r.color),
      photoCount: num(r.photoCount),
    })),
  };
}
