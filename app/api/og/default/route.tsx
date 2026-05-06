import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";

export const runtime = "nodejs";

const logoData = readFileSync(path.join(process.cwd(), "public/images/panopin-logo-dark.png"));
const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="Panopin" style={{ height: 56, width: "auto" }} />
          </div>

          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.05,
              color: "white",
              letterSpacing: -2,
              maxWidth: 950,
              marginBottom: 24,
            }}
          >
            Jak dobrze znasz swoją okolicę?
          </span>

          <span
            style={{
              fontSize: 26,
              color: "rgba(255,255,255,0.55)",
              fontWeight: 500,
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            Obejrzyj panoramę 360° i postaw pinezkę. 5 lokalizacji w rundzie — im celniej tym więcej punktów.
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
              background: "linear-gradient(135deg, #E8AA3C 0%, #B5811C 100%)",
              borderRadius: 11,
              padding: "12px 28px",
            }}
          >
            <span style={{ fontSize: 19, fontWeight: 700, color: "#2A1900" }}>
              Sprawdź się →
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
