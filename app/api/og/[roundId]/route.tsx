import { ImageResponse } from "next/og";
import { db } from "@/lib/db/client";
import { guesses, rounds } from "@/lib/db/schema";
import { and, count, eq, isNotNull, lt, ne } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roundId: string }> },
) {
  const { roundId } = await params;

  const [round] = await db
    .select({ totalScore: rounds.totalScore })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);

  const totalScore = round?.totalScore ?? 0;
  const scoreStr = totalScore.toLocaleString("pl-PL");

  // Percentile (same logic as finish endpoint)
  let topPercent: number | null = null;
  if (round?.totalScore != null) {
    const [{ beaten }] = await db
      .select({ beaten: count() })
      .from(rounds)
      .where(and(isNotNull(rounds.totalScore), ne(rounds.id, roundId), lt(rounds.totalScore, totalScore)));

    const [{ total }] = await db
      .select({ total: count() })
      .from(rounds)
      .where(and(isNotNull(rounds.totalScore), ne(rounds.id, roundId)));

    topPercent =
      Number(total) > 0
        ? Math.max(1, Math.ceil((1 - Number(beaten) / Number(total)) * 100))
        : null;
  }

  // Step scores for mini bar
  const steps = await db
    .select({ score: guesses.score, sequence: guesses.sequence })
    .from(guesses)
    .where(eq(guesses.roundId, roundId))
    .orderBy(guesses.sequence);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#0c0c10",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          padding: "64px 80px",
          justifyContent: "space-between",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "white" }}>Panopin</span>
          <span
            style={{
              fontSize: "12px",
              background: "#f59e0b22",
              color: "#f59e0b",
              padding: "4px 10px",
              borderRadius: "6px",
              fontWeight: "600",
              letterSpacing: "0.05em",
              border: "1px solid #f59e0b44",
            }}
          >
            WYNIKI
          </span>
        </div>

        {/* Score */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "100px", fontWeight: "800", lineHeight: 1, letterSpacing: "-2px" }}>
            {scoreStr}
          </div>
          <div style={{ fontSize: "28px", color: "#71717a", fontWeight: "500" }}>
            punktów z 5 lokalizacji
          </div>
          {topPercent !== null && (
            <div style={{ fontSize: "22px", color: "#f59e0b", fontWeight: "600", marginTop: "4px" }}>
              top {topPercent}% graczy
            </div>
          )}
        </div>

        {/* Step bars */}
        {steps.length > 0 && (
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            {steps.map((s) => {
              const h = Math.max(8, Math.round(((s.score ?? 0) / 5300) * 60));
              const color =
                (s.score ?? 0) >= 4000 ? "#4ade80" : (s.score ?? 0) >= 2000 ? "#f59e0b" : "#f87171";
              return (
                <div key={s.sequence} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: `${h}px`,
                      background: color,
                      borderRadius: "4px",
                    }}
                  />
                  <span style={{ fontSize: "16px", color: "#52525b" }}>{s.sequence}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
