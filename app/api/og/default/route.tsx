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
            borderRadius: 9999,
          }}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            padding: "80px 80px 60px",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                borderRadius: 16,
                marginRight: 18,
                fontSize: 36,
              }}
            >
              📍
            </div>
            <span
              style={{
                fontSize: 42,
                fontWeight: 800,
                color: "white",
                letterSpacing: -1,
              }}
            >
              Panopin
            </span>
          </div>

          <span
            style={{
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1.05,
              color: "white",
              letterSpacing: -2,
              maxWidth: 900,
              marginBottom: 24,
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
          }}
        >
          <span style={{ fontSize: 16, color: "rgba(255,255,255,0.32)" }}>
            panopin.leszczkow.pl
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              borderRadius: 11,
              padding: "12px 28px",
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
