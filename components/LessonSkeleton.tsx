// components/LessonSkeleton.tsx
// Skeleton unico per le pagine Lezione, riutilizzato in loading.tsx e HydrationGate

export default function LessonSkeleton({
  variant = "page",
}: {
  variant?: "page" | "inline";
}) {
  const Wrapper: React.ElementType = variant === "page" ? "div" : React.Fragment;
  const wrapperProps =
    variant === "page"
      ? { className: "mx-auto max-w-6xl px-4 pb-12" }
      : ({} as any);

  return (
    <Wrapper {...wrapperProps}>
      <article className="prose prose-slate dark:prose-invert">
        {/* Header card */}
        <div className="rounded-2xl ring-1 ring-slate-200 [.dark_&]:ring-slate-700 bg-white [.dark_&]:bg-slate-800 p-4 sm:p-5 animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="h-8 w-24 rounded-md bg-gray-200 [.dark_&]:bg-slate-700" />
            <div className="h-8 w-28 rounded-md bg-gray-200 [.dark_&]:bg-slate-700" />
          </div>
          <div className="mt-3 h-7 w-3/4 rounded-md bg-gray-300 [.dark_&]:bg-slate-600" />
          <div className="mt-2 h-4 w-1/2 rounded-md bg-gray-200 [.dark_&]:bg-slate-700" />
          <div className="mt-4 flex items-center justify-end gap-2">
            <div className="h-8 w-28 rounded-lg bg-gray-200 [.dark_&]:bg-slate-700" />
            <div className="h-8 w-20 rounded-lg bg-gray-200 [.dark_&]:bg-slate-700" />
          </div>
        </div>

        {/* Section index placeholder */}
        <div className="mt-4 h-10 w-full rounded-xl ring-1 ring-slate-200 [.dark_&]:ring-slate-700 bg-gray-50 [.dark_&]:bg-slate-900/40 animate-pulse" />

        {/* Body paragraphs */}
        <div className="mt-6 space-y-3 animate-pulse">
          <div className="h-4 w-full rounded bg-gray-200 [.dark_&]:bg-slate-700" />
          <div className="h-4 w-11/12 rounded bg-gray-200 [.dark_&]:bg-slate-700" />
          <div className="h-4 w-10/12 rounded bg-gray-200 [.dark_&]:bg-slate-700" />
          <div className="h-4 w-9/12 rounded bg-gray-200 [.dark_&]:bg-slate-700" />
        </div>
      </article>
    </Wrapper>
  );
}
import React from "react";
