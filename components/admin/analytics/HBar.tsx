export function HBar({
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
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, Math.round((safeValue / safeMax) * 100)));
  return (
    <div className="flex items-center gap-3 min-w-0">
      {label && (
        <span className="w-32 shrink-0 truncate text-sm text-muted-foreground text-right">
          {label}
        </span>
      )}
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color ? "" : "bg-primary"}`}
          style={{
            width: `${pct}%`,
            ...(color ? { backgroundColor: color } : {}),
          }}
        />
      </div>
      <span className="w-20 shrink-0 text-sm tabular-nums text-right">
        {safeValue.toLocaleString("pl-PL")}
        {suffix}
      </span>
    </div>
  );
}
