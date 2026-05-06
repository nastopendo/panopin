import type { RoundPerDay } from "@/lib/admin/analytics-data";

export function RoundsPerDayChart({ data }: { data: RoundPerDay[] }) {
  const filled: { day: string; count: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = data.find((r) => r.day === key);
    filled.push({ day: key, count: found?.count ?? 0 });
  }

  const max = Math.max(...filled.map((d) => d.count), 1);
  const total = filled.reduce((acc, d) => acc + d.count, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Brak rund w ostatnich 30 dniach
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-0.5 h-32">
        {filled.map((d) => (
          <div
            key={d.day}
            className="flex-1 flex flex-col justify-end"
            title={`${d.day}: ${d.count} rund`}
          >
            <div
              className="rounded-sm w-full transition-all bg-primary/85"
              style={{
                height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0)}%`,
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
