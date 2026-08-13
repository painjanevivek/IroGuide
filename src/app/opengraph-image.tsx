import { ImageResponse } from "next/og";

export const alt = "IroGuide — thoughtful critique for stronger design decisions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 78px",
          background: "#fffdf7",
          color: "#09090f",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 30, fontWeight: 700 }}>
          <div
            style={{
              width: 54,
              height: 54,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "#09090f",
              color: "#c8f45d",
            }}
          >
            I
          </div>
          IroGuide
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ color: "#6848e8", fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>
            DESIGN CRITIQUE, WITH CONTEXT
          </div>
          <div style={{ maxWidth: 980, fontSize: 76, fontWeight: 750, lineHeight: 1.02, letterSpacing: -4 }}>
            Make stronger design decisions.
          </div>
          <div style={{ maxWidth: 850, color: "#3d3c48", fontSize: 30, lineHeight: 1.35 }}>
            Structured, practical feedback for designers who want clarity—not generic scores.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 22 }}>
          <span>iroguide.com</span>
          <span style={{ color: "#6848e8", fontWeight: 700 }}>Observe · Explain · Improve</span>
        </div>
      </div>
    ),
    size,
  );
}
