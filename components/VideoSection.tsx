"use client";
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";
import BlackPopup from "@/components/BlackPopup";

export default function VideoSection({ url }: { url: string }) {
  const { isSubscribed } = useAuth();
  const [state, setState] = useState<"idle" | "video" | "popup">("idle");

  const handleClick = () => {
    if (isSubscribed) setState("video");
    else setState("popup");
  };

  const closePopup = () => setState("idle");

  return (
    <>
      {state === "video" ? (
        <video
          className="w-full mt-2 rounded-xl border-blue-500 border-3"
          controls
          src={url}
        />
      ) : (
        <button
          onClick={handleClick}
          className="bg-gradient-to-r py-2 from-blue-600 to-sky-400 w-full rounded-xl mt-1 text-white font-semibold text-lg"
        >
          Apri la videolezione ▶️
        </button>
      )}

      {state === "popup" && (
        <div
          onClick={closePopup}
          className="fixed inset-0 z-9 backdrop-blur-md flex justify-center items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className=" p-6 rounded-xl max-w-md w-full"
          >
            <BlackPopup />
          </div>
        </div>
      )}
    </>
  );
}
