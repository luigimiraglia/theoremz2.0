"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

function extractYouTubeId(input: string): string | null {
  try {
    const u = new URL(input);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1];
    if (u.pathname.includes("/shorts/"))
      return u.pathname.split("/shorts/")[1].split(/[?&]/)[0];
  } catch {}
  const m = input.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&]|$)/);
  return m?.[1] ?? null;
}

function extractStartSeconds(input: string): number {
  try {
    const u = new URL(input);
    const tParam = u.searchParams.get("t") || u.searchParams.get("start");
    if (!tParam) return 0;
    const asNumber = Number(tParam);
    if (Number.isFinite(asNumber)) return asNumber;
    return tParam.split(/(?=\D)/).reduce((s, part) => {
      const n = parseInt(part, 10);
      if (part.endsWith("h")) return s + n * 3600;
      if (part.endsWith("m")) return s + n * 60;
      if (part.endsWith("s")) return s + n;
      return s;
    }, 0);
  } catch {
    return 0;
  }
}

export default function YouTubeLite({
  url,
  title,
  className,
}: {
  url: string;
  title?: string;
  className?: string;
}) {
  const [play, setPlay] = useState(false);

  const { id, start, posterJpg, posterWebp } = useMemo(() => {
    const id = extractYouTubeId(url);
    const start = extractStartSeconds(url);
    const base = id ? `https://i.ytimg.com/vi/${id}` : "";
    return {
      id,
      start,
      posterJpg: id ? `${base}/hqdefault.jpg` : "",
      posterWebp: id
        ? `https://i.ytimg.com/vi_webp/${id}/maxresdefault.webp`
        : "",
    };
  }, [url]);

  if (!id) return null;

  return (
    <div
      className={[
        "relative w-full overflow-hidden rounded-2xl border",
        className,
      ].join(" ")}
    >
      <div className="relative aspect-video bg-black">
        {!play ? (
          <button
            type="button"
            aria-label="Riproduci video"
            className="group absolute inset-0 w-full h-full"
            onClick={() => setPlay(true)}
          >
            <Image
              src={posterWebp || posterJpg}
              alt={title || "Anteprima video"}
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover"
              priority={false}
            />
            <div className="absolute inset-0 grid place-items-center bg-black/20 group-hover:bg-black/25 transition" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="rounded-full bg-white/95 p-4 shadow-lg group-active:scale-95 transition">
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-red-600"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </button>
        ) : (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1${start ? `&start=${start}` : ""}`}
            title={title || "Video YouTube"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    </div>
  );
}
