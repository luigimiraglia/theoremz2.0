import { ImageResponse } from "next/og";
import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/sanityFetch";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const q = groq`*[_type=="lesson" && slug.current==$slug][0]{ title, subtitle, thumbnailUrl }`;

export default async function OG({
  params,
}: {
  params: Promise<{ lezione: string }>;
}) {
  const { lezione } = await params;
  const doc = await sanityFetch<{ title: string; subtitle?: string | null; thumbnailUrl?: string | null }>(q, { slug: lezione });
  const title = doc?.title || lezione.replace(/-/g, " ");
  const subtitle = doc?.subtitle || "Spiegazione + Esercizi svolti";

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
          background: "linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 100%)",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 24, opacity: 0.9 }}>Theoremz</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.1,
              textShadow: "0 4px 14px rgba(0,0,0,.25)",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.92 }}>{subtitle}</div>
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>Spiegazione chiara + Esempi</div>
        </div>
      </div>
    ),
    { ...size }
  );
}

