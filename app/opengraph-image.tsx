import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 48,
          background: "linear-gradient(135deg, #0ea5e9 0%, #1e3a8a 100%)",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.92 }}>Theoremz</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.1,
              textShadow: "0 4px 14px rgba(0,0,0,.25)",
            }}
          >
            Matematica e Fisica
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.94 }}>
            Spiegazioni chiare • Esercizi svolti • Videolezioni
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              background: "#22d3ee",
              boxShadow: "0 0 20px #22d3ee",
            }}
          />
          <div style={{ fontSize: 22, fontWeight: 700 }}>theoremz.com</div>
        </div>
      </div>
    ),
    { ...size }
  );
}

