"use client";

import { useState } from "react";
import type { RoundPerDay } from "@/lib/admin/analytics-data";

const dayFormatter = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
  day: "numeric",
  month: "long",
});

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return dayFormatter.format(d);
}

function pluralRounds(n: number): string {
  if (n === 1) return "runda";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "rundy";
  return "rund";
}

export function RoundsPerDayChart({ data }: { data: RoundPerDay[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

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
  const avg = Math.round((total / 30) * 10) / 10;

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Brak rund w ostatnich 30 dniach
      </p>
    );
  }

  const active = hovered != null ? filled[hovered] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            Łącznie:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {total.toLocaleString("pl-PL")}
            </span>
          </span>
          <span>
            Maks/dzień:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {max.toLocaleString("pl-PL")}
            </span>
          </span>
          <span>
            Średnia:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {avg.toLocaleString("pl-PL")}
            </span>
          </span>
        </div>
        <div className="min-h-[1.25rem] text-right">
          {active && (
            <span>
              <span className="text-foreground">{formatDay(active.day)}</span>
              {": "}
              <span className="font-medium text-foreground tabular-nums">
                {active.count.toLocaleString("pl-PL")}
              </span>{" "}
              {pluralRounds(active.count)}
            </span>
          )}
        </div>
      </div>

      <div
        className="relative flex items-stretch gap-0.5 h-32"
        onMouseLeave={() => setHovered(null)}
      >
        {filled.map((d, i) => {
          const isHovered = hovered === i;
          return (
            <div
              key={d.day}
              className="group relative flex-1 flex flex-col justify-end cursor-default"
              onMouseEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
            >
              <div
                className={`rounded-sm w-full transition-all ${
                  isHovered ? "bg-primary" : "bg-primary/85"
                }`}
                style={{
                  height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0)}%`,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{filled[0].day.slice(5)}</span>
        <span>{filled[14].day.slice(5)}</span>
        <span>{filled[29].day.slice(5)}</span>
      </div>
    </div>
  );
}
