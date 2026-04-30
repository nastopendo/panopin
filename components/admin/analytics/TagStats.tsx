import { HBar } from "./HBar";
import type { TagStat } from "@/lib/admin/analytics-data";

export function TagStats({ data }: { data: TagStat[] }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Brak tagów
      </p>
    );
  }

  const max = Math.max(...data.map((t) => t.photoCount), 1);

  return (
    <div className="space-y-3">
      {data.map((t) => (
        <HBar
          key={t.id}
          label={t.name}
          value={t.photoCount}
          max={max}
          color={t.color}
        />
      ))}
    </div>
  );
}
