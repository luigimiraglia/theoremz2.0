"use client";

import { useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthContext";

const LazyAssistant = dynamic(() => import("./TheoremzAiAssistant"), {
  ssr: false,
  loading: () => null,
});

export default function AiChatLauncher({
  lessonId,
  lessonTitle,
}: {
  lessonId?: string;
  lessonTitle?: string;
}) {
  const { isSubscribed } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "popup">("idle");
  const [Popup, setPopup] = useState<ComponentType | null>(null);

  return (
    <>
      {/* Lightweight launcher button always visible */}
      <button
        onClick={async () => {
          if (isSubscribed) {
            setLoaded(true);
            setOpen(true);
            return;
          }
          if (!Popup) {
            const mod = await import("@/components/BlackPopup");
            setPopup(() => mod.default ?? mod);
          }
          setState("popup");
        }}
        className="fixed bottom-16 sm:bottom-19 right-3 z-40 rounded-2xl px-5 py-2.5 text-white shadow-xl bg-gradient-to-r from-violet-700 to-purple-600 hover:from-violet-800 hover:to-purple-700 active:scale-95 transition-all flex items-center gap-2"
        aria-label="Apri Theoremz AI"
      >
        <SparklesIcon className="h-5 w-5" />
        <span className="font-semibold tracking-wide">Theoremz AI</span>
      </button>

      {/* Load heavy chat only when needed or after idle */}
      {loaded && (
        <LazyAssistant
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          initialOpen={open}
          hideLauncher
        />
      )}

      {state === "popup" && (
        <div
          onClick={() => setState("idle")}
          className="fixed inset-0 z-50 backdrop-blur-md flex justify-center items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-6 rounded-xl max-w-md w-full"
          >
            {Popup ? <Popup /> : null}
          </div>
        </div>
      )}
    </>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M5 12l2-4 2 4 4 2-4 2-2 4-2-4-4-2 4-2zM17 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM19 13l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"
        fill="currentColor"
      />
    </svg>
  );
}
