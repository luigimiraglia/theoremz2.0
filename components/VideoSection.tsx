"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthContext";

// Lazy del popup (assicurati che BlackPopup abbia default export + "use client")
const BlackPopup = dynamic(
  () => import("./BlackPopup").then((m) => m.default),
  {
    ssr: false,
    loading: () => null,
  }
);

// ——— util piccolo per capire se è YouTube e costruire l’embed
function toYouTubeEmbed(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}`;
    }
    const v = u.searchParams.get("v");
    if (u.hostname.includes("youtube.com") && v) {
      return `https://www.youtube.com/embed/${v}`;
    }
    if (u.pathname.includes("/embed/")) return u.toString();
  } catch {}
  return null;
}

// ——— Skeleton overlay
function SkeletonPlayer() {
  return (
    <div
      className="absolute inset-0 animate-pulse rounded-2xl
                 bg-gradient-to-br from-slate-200 to-slate-300
                 [.dark_&]:from-slate-800 [.dark_&]:to-slate-700"
      aria-hidden="true"
    />
  );
}

export default function VideoSection({
  url,
  title,
}: {
  url: string;
  title?: string;
}) {
  const { isSubscribed } = useAuth();
  const [state, setState] = useState<"idle" | "video" | "popup">("idle");
  const [loaded, setLoaded] = useState(false);

  const isYouTube = useMemo(
    () => /(?:youtu\.be|youtube\.com)/i.test(url),
    [url]
  );
  const ytBase = useMemo(
    () => (isYouTube ? toYouTubeEmbed(url) : null),
    [isYouTube, url]
  );

  // reset skeleton ad ogni apertura player
  useEffect(() => {
    if (state === "video") setLoaded(false);
  }, [state]);

  const handleClick = () => {
    if (isSubscribed) setState("video");
    else setState("popup");
  };

  // ——— bottone sempre visibile finché non montiamo il player
  if (state !== "video") {
    return (
      <>
        <button
          onClick={handleClick}
          className="bg-gradient-to-r from-blue-600 to-sky-400 w-full rounded-xl mt-1 text-white font-semibold text-lg py-2"
        >
          Apri la videolezione ▶️
        </button>

        {state === "popup" && (
          <div
            onClick={() => setState("idle")}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-center items-center"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-6 rounded-xl max-w-md w-[92vw] bg-transparent"
            >
              <BlackPopup />
            </div>
          </div>
        )}
      </>
    );
  }

  // ——— stato "video": player + skeleton fino a load
  return isYouTube && ytBase ? (
    <div
      className="mt-3 rounded-2xl overflow-hidden aspect-video relative"
      aria-busy={!loaded}
    >
      {!loaded && <SkeletonPlayer />}
      <iframe
        className={`h-full w-full transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        src={`${ytBase}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
        title={title || "Videolezione"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
      />
    </div>
  ) : (
    <div
      className="mt-3 rounded-2xl overflow-hidden aspect-video relative"
      aria-busy={!loaded}
    >
      {!loaded && <SkeletonPlayer />}
      <video
        className={`h-full w-full rounded-2xl border-blue-500 border-3 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        controls
        autoPlay
        playsInline
        preload="metadata"
        src={url}
        onLoadedData={() => setLoaded(true)}
        onCanPlay={() => setLoaded(true)}
      />
    </div>
  );
}
