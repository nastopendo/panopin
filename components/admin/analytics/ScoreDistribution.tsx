import { HBar } from "./HBar";
import type { ScoreBucket } from "@/lib/admin/analytics-data";

const SCORE_LABELS: Record<number, string> = {
  0: "0–4 999",
  1: "5 000–9 999",
  2: "10 000–14 999",
  3: "15 000–19 999",
  4: "20 000–24 999",
  5: "25 000+",
};

export function ScoreDistribution({ data }: { data: ScoreBucket[] }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Brak ukończonych rund
      </p>
    );
  }

  // Bucket >= 5 collapses into the "25 000+" group.
  const collapsed = new Map<number, number>();
  for (const row of data) {
    const key = row.bucket >= 5 ? 5 : row.bucket;
    collapsed.set(key, (collapsed.get(key) ?? 0) + row.count);
  }

  const max = Math.max(...Array.from(collapsed.values()), 1);

  return (
    <div className="space-y-3">
      {[0, 1, 2, 3, 4, 5].map((bucket) => (
        <HBar
          key={bucket}
          label={SCORE_LABELS[bucket]}
          value={collapsed.get(bucket) ?? 0}
          max={max}
        />
      ))}
    </div>
  );
}
