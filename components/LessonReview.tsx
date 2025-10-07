"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
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
  const containerRef = useRef<HTMLElement | null>(null);
  const loadingRef = useRef<Promise<any> | null>(null);

  function openForm() {
    setShowForm(true);
    try { track("review_open_form", { lesson: lessonSlug }); } catch {}
    if (!FormComp) {
      loadForm();
    }
  }

  function loadForm() {
    if (FormComp || loadingRef.current) return;
    loadingRef.current = import("./LessonReviewForm")
      .then((m) => {
        setFormComp(() => m.default);
      })
      .catch(() => {
        // Allow retry on demand if the network failed.
        loadingRef.current = null;
      })
      .finally(() => {
        loadingRef.current = null;
      });
  }

  useEffect(() => {
    if (showForm && !FormComp) {
      loadForm();
    }
  }, [showForm, FormComp]);

  useEffect(() => {
    if (FormComp) return;
    const el = containerRef.current;
    if (!el || typeof window === "undefined") return;

    let idleId: number | null = null;
    let rafId: number | null = null;
    let io: IntersectionObserver | null = null;

    const maybeLoad = () => {
      if (!FormComp) loadForm();
    };

    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            maybeLoad();
            io?.disconnect();
          }
        },
        { rootMargin: "200px" }
      );
      io.observe(el);
    }

    if ("requestIdleCallback" in window) {
      idleId = (window as any).requestIdleCallback(maybeLoad, { timeout: 2000 });
    } else {
      rafId = window.requestAnimationFrame(maybeLoad);
    }

    return () => {
      io?.disconnect();
      if (idleId && "cancelIdleCallback" in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [FormComp]);

  return (
    <section
      aria-labelledby="lesson-review-title"
      className="mt-6"
      ref={containerRef}
    >
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
