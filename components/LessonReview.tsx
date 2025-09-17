"use client";

import React, { useState, Suspense } from "react";
import { track } from "@/lib/analytics";

export default function LessonReview({
  lessonSlug,
  lessonTitle,
}: {
  lessonSlug: string;
  lessonTitle?: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [FormComp, setFormComp] = useState<any>(null);

  function openForm() {
    setShowForm(true);
    try { track("review_open_form", { lesson: lessonSlug }); } catch {}
    if (!FormComp) {
      import("./LessonReviewForm").then((m) => setFormComp(() => m.default));
    }
  }

  return (
    <section aria-labelledby="lesson-review-title" className="mt-6">
      {!showForm && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300/60 bg-white [.dark_&]:bg-slate-900 px-4 py-3">
          <div className="text-[15px] font-semibold text-slate-800 [.dark_&]:text-slate-100">
            Hai trovato utile questa lezione?
          </div>
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-4 py-2 text-sm font-black text-black hover:from-amber-400 hover:to-yellow-300"
          >
            Lascia una recensione
          </button>
        </div>
      )}

      {showForm && (
        <Suspense fallback={<div className="mt-4 h-10 w-32 animate-pulse rounded-xl bg-amber-200/60" />}> 
          {FormComp ? (
            <FormComp lessonSlug={lessonSlug} onCancel={() => setShowForm(false)} />
          ) : null}
        </Suspense>
      )}
    </section>
  );
}
