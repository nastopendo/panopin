import { db } from "@/lib/db/client";
import {
  rounds,
  guesses,
  photos,
  profiles,
  tags,
  photoTags,
  tournaments,
} from "@/lib/db/schema";
import { count, avg, isNotNull, eq, sql } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Users,
  Target,
  Image as ImageIcon,
  Trophy,
  RefreshCcw,
} from "lucide-react";

// ---- types ---------------------------------------------------------------

interface RoundPerDay {
  day: string;
  count: number;
}

interface ScoreBucket {
  bucket: number;
  count: number;
}

interface TopPhoto {
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  guessCount: number;
  avgScore: number | null;
}

interface TagStat {
  id: string;
  name: string;
  color: string;
  photoCount: number;
}

// ---- data fetching -------------------------------------------------------

async function getAnalytics() {
  const [
    totalRoundsResult,
    completedRoundsResult,
    totalGuessesResult,
    totalPhotosResult,
    totalPlayersResult,
    avgScoreResult,
    active7Result,
    returningResult,
    totalTournamentsResult,
    roundsPerDayResult,
    scoreDistResult,
    topPhotosResult,
    tagStatsResult,
  ] = await Promise.all([
    db.select({ v: count() }).from(rounds),
    db.select({ v: count() }).from(rounds).where(isNotNull(rounds.completedAt)),
    db.select({ v: count() }).from(guesses),
    db
      .select({ v: count() })
      .from(photos)
      .where(eq(photos.status, "published")),
    db
      .select({ v: count() })
      .from(profiles)
      .where(eq(profiles.role, "player")),
    db
      .select({ v: avg(rounds.totalScore) })
      .from(rounds)
      .where(isNotNull(rounds.totalScore)),
    db.execute(
      sql`SELECT COUNT(DISTINCT COALESCE(user_id::text, anon_session_id))::int AS val
          FROM rounds
          WHERE started_at >= NOW() - INTERVAL '7 days'`,
    ),
    db.execute(
      sql`SELECT COUNT(*)::int AS val
          FROM (
            SELECT COALESCE(user_id::text, anon_session_id) AS pid
            FROM rounds
            WHERE user_id IS NOT NULL OR anon_session_id IS NOT NULL
            GROUP BY pid
            HAVING COUNT(*) > 1
          ) t`,
    ),
    db.select({ v: count() }).from(tournaments),
    db.execute(
      sql`SELECT DATE_TRUNC('day', started_at)::date::text AS day,
                 COUNT(*)::int AS count
          FROM rounds
          WHERE started_at >= NOW() - INTERVAL '30 days'
          GROUP BY day
          ORDER BY day ASC`,
    ),
    db.execute(
      sql`SELECT FLOOR(total_score / 5000)::int AS bucket,
                 COUNT(*)::int AS count
          FROM rounds
          WHERE total_score IS NOT NULL
          GROUP BY bucket
          ORDER BY bucket`,
    ),
    db.execute(
      sql`SELECT p.id,
                 p.title,
                 p.thumbnail_url AS "thumbnailUrl",
                 COUNT(g.id)::int AS "guessCount",
                 ROUND(AVG(g.score))::int AS "avgScore"
          FROM photos p
          LEFT JOIN guesses g ON g.photo_id = p.id
          WHERE p.status = 'published'
          GROUP BY p.id, p.title, p.thumbnail_url
          ORDER BY "guessCount" DESC
          LIMIT 10`,
    ),
    db.execute(
      sql`SELECT t.id,
                 t.name,
                 t.color,
                 COUNT(DISTINCT pt.photo_id)::int AS "photoCount"
          FROM tags t
          LEFT JOIN photo_tags pt ON pt.tag_id = t.id
          GROUP BY t.id, t.name, t.color
          ORDER BY "photoCount" DESC`,
    ),
  ]);

  const rawAvg = avgScoreResult[0]?.v;

  return {
    totalRounds: totalRoundsResult[0].v,
    completedRounds: completedRoundsResult[0].v,
    totalGuesses: totalGuessesResult[0].v,
    totalPhotos: totalPhotosResult[0].v,
    totalPlayers: totalPlayersResult[0].v,
    avgScore: rawAvg ? Math.round(Number(rawAvg)) : 0,
    active7: Number((active7Result[0] as { val: unknown })?.val ?? 0),
    returningPlayers: Number(
      (returningResult[0] as { val: unknown })?.val ?? 0,
    ),
    totalTournaments: totalTournamentsResult[0].v,
    roundsPerDay: roundsPerDayResult as unknown as RoundPerDay[],
    scoreDist: scoreDistResult as unknown as ScoreBucket[],
    topPhotos: topPhotosResult as unknown as TopPhoto[],
    tagStats: tagStatsResult as unknown as TagStat[],
  };
}

// ---- sub-components ------------------------------------------------------

function StatCard({
  icon: Icon,
  title,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString("pl-PL")}</div>
        {sub && (
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

function HBar({
  label,
  value,
  max,
  color,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-32 shrink-0 truncate text-sm text-muted-foreground text-right">
        {label}
      </span>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: color ?? "hsl(var(--primary))",
          }}
        />
      </div>
      <span className="w-14 shrink-0 text-sm tabular-nums text-right">
        {value.toLocaleString("pl-PL")}
        {suffix}
      </span>
    </div>
  );
}

function VBarChart({ data }: { data: RoundPerDay[] }) {
  if (data.length === 0)
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Brak danych
      </p>
    );

  // Fill all 30 days
  const filled: { day: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = data.find((r) => r.day === key);
    filled.push({ day: key, count: found?.count ?? 0 });
  }

  const max = Math.max(...filled.map((d) => d.count), 1);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-0.5 h-32">
        {filled.map((d) => (
          <div
            key={d.day}
            className="flex-1 flex flex-col justify-end"
            title={`${d.day}: ${d.count} rund`}
          >
            <div
              className="rounded-sm w-full transition-all"
              style={{
                height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0)}%`,
                backgroundColor: "hsl(var(--primary))",
                opacity: 0.85,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{filled[0].day.slice(5)}</span>
        <span>{filled[14].day.slice(5)}</span>
        <span>{filled[29].day.slice(5)}</span>
      </div>
    </div>
  );
}

const SCORE_LABELS: Record<number, string> = {
  0: "0–4 999",
  1: "5 000–9 999",
  2: "10 000–14 999",
  3: "15 000–19 999",
  4: "20 000–24 999",
  5: "25 000+",
};

export const dynamic = "force-dynamic";
export const maxDuration = 30;
// Run close to Supabase eu-west-1 (Ireland) — reduces cold-start connection latency
export const preferredRegion = ["dub1", "lhr1", "cdg1"];

// ---- page ----------------------------------------------------------------

export default async function AdminAnalyticsPage() {
  let s: Awaited<ReturnType<typeof getAnalytics>>;
  try {
    s = await getAnalytics();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <div className="space-y-4 max-w-6xl">
        <h1 className="text-2xl font-bold tracking-tight">Analityka</h1>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Nie udało się pobrać danych</p>
          <p className="mt-1 font-mono text-xs opacity-70">{msg}</p>
        </div>
      </div>
    );
  }

  const completionRate =
    s.totalRounds > 0
      ? Math.round((s.completedRounds / s.totalRounds) * 100)
      : 0;

  const maxScoreBucket = Math.max(...s.scoreDist.map((b) => b.count), 1);
  const maxTagPhotos = Math.max(...s.tagStats.map((t) => t.photoCount), 1);
  const maxGuesses = Math.max(
    ...(s.topPhotos.map((p) => p.guessCount) ?? [1]),
    1,
  );

  return (
    <div className="space-y-8 max-w-6xl">
      <h1 className="text-2xl font-bold tracking-tight">Analityka</h1>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Activity}
          title="Łącznie rund"
          value={s.totalRounds}
          sub={`${s.completedRounds.toLocaleString("pl-PL")} ukończonych (${completionRate}%)`}
        />
        <StatCard
          icon={Users}
          title="Aktywni gracze (7 dni)"
          value={s.active7}
          sub={`${s.returningPlayers.toLocaleString("pl-PL")} powracających`}
        />
        <StatCard
          icon={Target}
          title="Łącznie guessów"
          value={s.totalGuesses}
          sub={`śr. wynik ${s.avgScore.toLocaleString("pl-PL")} pkt`}
        />
        <StatCard
          icon={ImageIcon}
          title="Opublikowane zdjęcia"
          value={s.totalPhotos}
        />
        <StatCard
          icon={RefreshCcw}
          title="Zarejestrowani gracze"
          value={s.totalPlayers}
        />
        <StatCard
          icon={Trophy}
          title="Turnieje"
          value={s.totalTournaments}
        />
      </div>

      {/* Rounds per day */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rundy / dzień (ostatnie 30 dni)</CardTitle>
        </CardHeader>
        <CardContent>
          <VBarChart data={s.roundsPerDay} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rozkład wyników</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.scoreDist.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Brak danych
              </p>
            ) : (
              [0, 1, 2, 3, 4, 5].map((bucket) => {
                const found = s.scoreDist.find((b) => b.bucket === bucket);
                return (
                  <HBar
                    key={bucket}
                    label={SCORE_LABELS[bucket] ?? `${bucket * 5000}+`}
                    value={found?.count ?? 0}
                    max={maxScoreBucket}
                  />
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tagi (liczba zdjęć)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.tagStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Brak tagów
              </p>
            ) : (
              s.tagStats.map((t) => (
                <HBar
                  key={t.id}
                  label={t.name}
                  value={t.photoCount}
                  max={maxTagPhotos}
                  color={t.color}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Najpopularniejsze zdjęcia (top 10 wg guessów)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {s.topPhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Brak danych
            </p>
          ) : (
            <div className="space-y-3">
              {s.topPhotos.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 min-w-0">
                  <span className="w-5 shrink-0 text-xs text-muted-foreground text-right">
                    {i + 1}.
                  </span>
                  {p.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnailUrl}
                      alt=""
                      className="size-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-10 rounded bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {p.title ?? <span className="text-muted-foreground italic">bez tytułu</span>}
                    </p>
                    <div className="mt-1">
                      <HBar
                        label=""
                        value={p.guessCount}
                        max={maxGuesses}
                        suffix=" guessów"
                      />
                    </div>
                  </div>
                  {p.avgScore != null && (
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      ø {p.avgScore.toLocaleString("pl-PL")} pkt
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
