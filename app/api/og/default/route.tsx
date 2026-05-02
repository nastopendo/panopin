import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET() {
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
        <div
          style={{
            position: "absolute",
            top: -180,
            left: 160,
            width: 880,
            height: 520,
            background:
              "radial-gradient(ellipse, rgba(245,158,11,0.28) 0%, rgba(245,158,11,0.06) 55%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

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

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            padding: "80px 80px 60px",
            justifyContent: "center",
            gap: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                borderRadius: 16,
                boxShadow: "0 0 32px rgba(245,158,11,0.55)",
              }}
            >
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 13a9 9 0 0 1 18 0" />
                <circle cx="12" cy="14.5" r="2.5" fill="white" stroke="none" />
              </svg>
            </div>
            <span style={{ fontSize: 42, fontWeight: 800, color: "white", letterSpacing: "-1px" }}>
              Panopin
            </span>
          </div>

          <span
            style={{
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1.05,
              color: "white",
              letterSpacing: "-2px",
              maxWidth: 900,
            }}
          >
            Zgadnij gdzie zrobiono panoramę 360°
          </span>

          <span
            style={{
              fontSize: 26,
              color: "rgba(255,255,255,0.55)",
              fontWeight: 500,
              maxWidth: 850,
              lineHeight: 1.35,
            }}
          >
            5 lokalizacji, mapa świata, im bliżej tym więcej punktów
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 80px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.022)",
          }}
        >
          <span style={{ fontSize: 16, color: "rgba(255,255,255,0.32)" }}>panopin.app</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              borderRadius: 11,
              padding: "12px 28px",
              boxShadow: "0 4px 22px rgba(245,158,11,0.45)",
            }}
          >
            <span style={{ fontSize: 19, fontWeight: 700, color: "white" }}>
              Zagraj teraz — to darmowe!
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
