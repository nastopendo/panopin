import { HBar } from "./HBar";
import type { TopPhoto } from "@/lib/admin/analytics-data";

export function TopPhotos({ data }: { data: TopPhoto[] }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Brak zdjęć
      </p>
    );
  }

  const max = Math.max(...data.map((p) => p.guessCount), 1);

  return (
    <div className="space-y-3">
      {data.map((p, i) => (
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
              loading="lazy"
            />
          ) : (
            <div className="size-10 rounded bg-muted shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">
              {p.title ?? (
                <span className="text-muted-foreground italic">bez tytułu</span>
              )}
            </p>
            <div className="mt-1">
              <HBar
                label=""
                value={p.guessCount}
                max={max}
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
  );
}
