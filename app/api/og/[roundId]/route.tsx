import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";
import { db } from "@/lib/db/client";
import { guesses, rounds } from "@/lib/db/schema";
import { and, count, eq, isNotNull, lt, ne } from "drizzle-orm";

const logoData = readFileSync(path.join(process.cwd(), "public/images/panopin-logo-dark.png"));
const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

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

  const steps = await db
    .select({ score: guesses.score, sequence: guesses.sequence })
    .from(guesses)
    .where(eq(guesses.roundId, roundId))
    .orderBy(guesses.sequence);

  const BAR_MAX_H = 72;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#09090b",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Aurora glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: 160,
            width: 880,
            height: 520,
            background:
              "radial-gradient(ellipse, rgba(245,158,11,0.26) 0%, rgba(245,158,11,0.05) 55%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* Decorative map-pin arc — top right */}
        <svg
          width="340"
          height="340"
          viewBox="0 0 340 340"
          style={{ position: "absolute", top: -50, right: -50, opacity: 0.07 }}
        >
          <path
            d="M 55 270 A 210 210 0 0 1 285 270"
            fill="none"
            stroke="white"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <circle cx="170" cy="200" r="38" fill="white" />
          <circle cx="170" cy="200" r="21" fill="#09090b" />
        </svg>

        {/* Subtle grid */}
        <svg
          width="1200"
          height="630"
          style={{ position: "absolute", top: 0, left: 0, opacity: 0.025 }}
        >
          {Array.from({ length: 25 }, (_, i) => (
            <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="630" stroke="white" strokeWidth="1" />
          ))}
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 50} x2="1200" y2={i * 50} stroke="white" strokeWidth="1" />
          ))}
        </svg>

        {/* Logo row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "44px 72px 0",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Panopin" style={{ height: 44, width: "auto" }} />
        </div>

        {/* Main content row */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "row",
            padding: "28px 72px 44px",
          }}
        >
          {/* Left: score */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "flex-end",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.38)",
                letterSpacing: "0.12em",
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Wynik z 5 lokalizacji
            </span>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, lineHeight: 1 }}>
              <span
                style={{
                  fontSize: 104,
                  fontWeight: 900,
                  letterSpacing: "-4px",
                  color: "white",
                  lineHeight: 1,
                }}
              >
                {scoreStr}
              </span>
              <span
                style={{
                  fontSize: 30,
                  color: "rgba(255,255,255,0.38)",
                  marginBottom: 14,
                  fontWeight: 500,
                }}
              >
                pkt
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "nowrap" }}>
              {topPercent !== null && (
                <div
                  style={{
                    display: "flex",
                    background: "rgba(245,158,11,0.13)",
                    border: "1.5px solid rgba(245,158,11,0.42)",
                    borderRadius: 10,
                    padding: "8px 18px",
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>
                    🏆 Top {topPercent}% graczy
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  background: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(255,255,255,0.11)",
                  borderRadius: 10,
                  padding: "8px 18px",
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.58)" }}>
                  A ile Ty zdobędziesz? →
                </span>
              </div>
            </div>
          </div>

          {/* Right: bars */}
          {steps.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.28)",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Rundy
              </span>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                {steps.map((s) => {
                  const h = Math.max(10, Math.round(((s.score ?? 0) / 5300) * BAR_MAX_H));
                  const sc = s.score ?? 0;
                  const color = sc >= 4000 ? "#4ade80" : sc >= 2000 ? "#f59e0b" : "#f87171";
                  const glow =
                    sc >= 4000
                      ? "rgba(74,222,128,0.35)"
                      : sc >= 2000
                        ? "rgba(245,158,11,0.35)"
                        : "rgba(248,113,113,0.35)";
                  return (
                    <div
                      key={s.sequence}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <span style={{ fontSize: 13, color, fontWeight: 700 }}>
                        {(sc / 1000).toFixed(1)}k
                      </span>
                      <div
                        style={{
                          width: 46,
                          height: h,
                          background: color,
                          borderRadius: 6,
                          boxShadow: `0 0 14px ${glow}`,
                        }}
                      />
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                        {s.sequence}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 72px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.022)",
          }}
        >
          <span style={{ fontSize: 15, color: "rgba(255,255,255,0.3)" }}>panopin.app</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "linear-gradient(135deg, #E8AA3C 0%, #B5811C 100%)",
              borderRadius: 10,
              padding: "10px 24px",
              boxShadow: "0 4px 20px rgba(232,170,60,0.4)",
            }}
          >
            <span style={{ fontSize: 17, fontWeight: 700, color: "#2A1900" }}>
              Sprawdź się →
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
