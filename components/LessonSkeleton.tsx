// components/LessonSkeleton.tsx
// Skeleton unico per le pagine Lezione, riutilizzato in loading.tsx e HydrationGate

export default function LessonSkeleton({
  variant = "page",
}: {
  variant?: "page" | "inline";
}) {
  const Wrapper: React.ElementType = variant === "page" ? "div" : React.Fragment;
  const wrapperProps = variant === "page" ? { className: "" } : ({} as any);

  return (
    <Wrapper {...wrapperProps}>
      {/* Mantieni esattamente la stessa struttura e padding della view reale */}
      <article className="mx-auto max-w-6xl px-4 sm:px-6 pb-12">
        {/* Header card aligned like real header (text-center + right reserved space) */}
        <div className="relative rounded-2xl ring-1 ring-slate-200 [.dark_&]:ring-slate-700 bg-gray-50 [.dark_&]:bg-slate-800/80 pt-3 pb-4 text-center pr-0 sm:pr-[140px] animate-pulse">
          <div className="mx-auto h-8 w-3/4 rounded-md bg-gray-300 [.dark_&]:bg-slate-600" />
          <div className="mx-auto mt-2 h-4 w-1/2 rounded-md bg-gray-200 [.dark_&]:bg-slate-700" />
          <div className="mt-4 flex items-center justify-end gap-2 pr-3">
            <div className="h-8 w-28 rounded-lg bg-gray-200 [.dark_&]:bg-slate-700" />
            <div className="h-8 w-20 rounded-lg bg-gray-200 [.dark_&]:bg-slate-700" />
          </div>
        </div>

        {/* Section index placeholder (same vertical rhythm as real nav) */}
        <div className="my-4 h-10 w-full rounded-xl ring-1 ring-slate-200 [.dark_&]:ring-slate-700 bg-gray-50 [.dark_&]:bg-slate-900/40 animate-pulse" />

        {/* Body paragraphs inside a prose container with max-w-none like the real page */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <div className="mt-6 space-y-3 animate-pulse">
            <div className="h-4 w-full rounded bg-gray-200 [.dark_&]:bg-slate-700" />
            <div className="h-4 w-11/12 rounded bg-gray-200 [.dark_&]:bg-slate-700" />
            <div className="h-4 w-10/12 rounded bg-gray-200 [.dark_&]:bg-slate-700" />
            <div className="h-4 w-9/12 rounded bg-gray-200 [.dark_&]:bg-slate-700" />
          </div>
        </div>
      </article>
    </Wrapper>
  );
}
import React from "react";
