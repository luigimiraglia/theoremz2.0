"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { track, trackConversion } from "@/lib/analytics";
import Icon from "./Icon";

const HEADER_SELECTOR = "#site-header";
const HEADER_GAP_PX = 14;
const PRIORITY_BANNER_EVENT = "theoremz:priority-banner";

type Props = {
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
  exerciseCount: number;
};

export default function FreeExercisesPdfBanner({
  lessonId,
  lessonTitle,
  lessonSlug,
  exerciseCount,
}: Props) {
  const { user } = useAuth();
  const [authReady, setAuthReady] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topOffset, setTopOffset] = useState<number | null>(null);

  const storageKey = useMemo(
    () => `free-exercises-pdf-dismissed:${lessonSlug}`,
    [lessonSlug]
  );

  const formValid = isValidEmail(email) && normalizePhone(phone).length >= 8;
  const shouldShow = authReady && isAnonymous && !dismissed && visible;

  const setPriorityBannerActive = useCallback((active: boolean) => {
    try {
      window.dispatchEvent(
        new CustomEvent(PRIORITY_BANNER_EVENT, {
          detail: { source: "free-exercises-pdf", active },
        })
      );
    } catch {}
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    import("@/lib/firebase")
      .then(({ auth }) => {
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (cancelled) return;
          setAuthReady(true);
          setIsAnonymous(!firebaseUser);
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAuthReady(true);
        setIsAnonymous(!user);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsAnonymous(false);
      setVisible(false);
      setPriorityBannerActive(false);
    }
  }, [setPriorityBannerActive, user]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === "1") {
        setDismissed(true);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    const header = document.querySelector(HEADER_SELECTOR) as HTMLElement | null;

    const computeTop = () => {
      if (!header) {
        setTopOffset(96);
        return;
      }

      const css = getComputedStyle(header);
      const stickyTop = parseFloat(css.top || "0") || 0;
      const height = header.offsetHeight || 0;
      setTopOffset(Math.max(0, Math.round(stickyTop + height + HEADER_GAP_PX)));
    };

    computeTop();

    let resizeObserver: ResizeObserver | null = null;
    if (header && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => requestAnimationFrame(computeTop));
      resizeObserver.observe(header);
    }

    const onResize = () => requestAnimationFrame(computeTop);
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (dismissed) return;
    let showTimer: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      if (!authReady || !isAnonymous) return;
      const threshold = Math.min(520, Math.max(260, window.innerHeight * 0.42));
      if (window.scrollY > threshold) {
        window.removeEventListener("scroll", onScroll);
        setPriorityBannerActive(true);
        showTimer = setTimeout(() => setVisible(true), 180);
        try {
          track("free_exercises_pdf_banner_view", {
            lesson_id: lessonId,
            lesson_slug: lessonSlug,
          });
        } catch {}
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (showTimer) clearTimeout(showTimer);
    };
  }, [authReady, dismissed, isAnonymous, lessonId, lessonSlug, setPriorityBannerActive]);

  useEffect(() => {
    return () => setPriorityBannerActive(false);
  }, [setPriorityBannerActive]);

  const closeBanner = () => {
    setDismissed(true);
    setVisible(false);
    setPriorityBannerActive(false);
    try {
      sessionStorage.setItem(storageKey, "1");
      track("free_exercises_pdf_banner_dismiss", {
        lesson_id: lessonId,
        lesson_slug: lessonSlug,
      });
    } catch {}
  };

  const openForm = () => {
    setError(null);
    setOpen(true);
    try {
      trackConversion("lead_form_open", "free_exercises_pdf_banner", {
        popup_type: "free_exercises_pdf",
        location: "lesson_scroll_banner",
        lesson_id: lessonId,
        lesson_slug: lessonSlug,
      });
    } catch {}
  };

  const downloadPdf = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formValid || loading) return;

    setError(null);
    setLoading(true);
    const generatedAt = Date.now();

    try {
      const response = await fetch(`/api/exercises-pdf?v=${generatedAt}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          lessonId,
          lessonTitle,
          lessonSlug,
          email: email.trim(),
          phone: phone.trim(),
          pageUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || "Non riesco a generare il PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(lessonTitle)}-esercizi-theoremz-${generatedAt}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      try {
        trackConversion("lead_submit", "free_exercises_pdf_download", {
          popup_type: "free_exercises_pdf",
          location: "lesson_scroll_banner",
          lesson_id: lessonId,
          lesson_slug: lessonSlug,
        });
        sessionStorage.setItem(storageKey, "1");
      } catch {}

      setOpen(false);
      setDismissed(true);
      setVisible(false);
      setPriorityBannerActive(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il download.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        role="region"
        aria-label="PDF gratuito esercizi"
        style={{ top: topOffset ?? 96 }}
        className={`fixed inset-x-0 z-40 pointer-events-none transition-all duration-500 ${
          shouldShow
            ? "translate-y-0 opacity-100"
            : "-translate-y-6 opacity-0"
        }`}
        aria-hidden={!shouldShow}
      >
        <div
          className={`mx-auto flex w-[calc(100%-1rem)] max-w-xl items-center gap-2 rounded-2xl border border-white/20 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-2.5 text-white shadow-lg shadow-blue-900/15 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md sm:gap-3 sm:p-3 ${
            shouldShow ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20 sm:h-9 sm:w-9">
              <Icon name="document" size="sm" />
            </div>
            <div className="min-w-0">
              <p className="m-0 truncate text-xs font-black leading-snug sm:text-sm">
                PDF gratuito degli esercizi
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={openForm}
              className="inline-flex flex-none items-center justify-center rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-[#1d4ed8] shadow-sm transition hover:bg-blue-50 sm:px-3.5 sm:py-2"
            >
              Scarica
            </button>
            <button
              type="button"
              onClick={closeBanner}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/25 text-white/85 transition hover:bg-white/10 sm:h-9 sm:w-9"
              aria-label="Chiudi"
            >
              <span aria-hidden="true" className="relative h-3.5 w-3.5">
                <span className="absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current" />
                <span className="absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-md"
          onClick={() => !loading && setOpen(false)}
        >
          <form
            onSubmit={downloadPdf}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-950/20 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900"
          >
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-5 py-4 text-white sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Icon name="document" size="md" />
                </div>
                <div>
                  <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-white/80">
                    Theoremz
                  </p>
                  <h2 className="m-0 text-xl font-black leading-tight">
                    PDF esercizi gratuito
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/70 p-3 [.dark_&]:border-blue-900/50 [.dark_&]:bg-blue-950/25">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="m-0 text-sm font-black text-slate-950 [.dark_&]:text-white">
                      PDF esercizi della lezione
                    </p>
                    <p className="m-0 mt-0.5 text-xs font-semibold text-slate-600 [.dark_&]:text-slate-300">
                      Download immediato - {exerciseCount} esercizi
                    </p>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-1.5 text-sm font-black text-[#2b7fff] shadow-sm [.dark_&]:bg-slate-900">
                    0€
                  </div>
                </div>
              </div>

              <p className="m-0 mb-5 text-sm font-semibold leading-relaxed text-slate-600 [.dark_&]:text-slate-300">
                Inserisci i dati per scaricare. Ti manderemo una copia alla tua email.
              </p>

              <label className="mb-3 block">
                <span className="mb-1.5 block text-sm font-bold text-slate-800 [.dark_&]:text-slate-100">
                  Email
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nome@email.com"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#2b7fff] focus:ring-4 focus:ring-blue-100 [.dark_&]:border-slate-600 [.dark_&]:bg-slate-950 [.dark_&]:text-white [.dark_&]:focus:ring-blue-500/20"
                />
              </label>

              <label className="mb-4 block">
                <span className="mb-1.5 block text-sm font-bold text-slate-800 [.dark_&]:text-slate-100">
                  Telefono
                </span>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+39 333 123 4567"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#2b7fff] focus:ring-4 focus:ring-blue-100 [.dark_&]:border-slate-600 [.dark_&]:bg-slate-950 [.dark_&]:text-white [.dark_&]:focus:ring-blue-500/20"
                />
              </label>

              {error && (
                <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 [.dark_&]:border-red-900 [.dark_&]:bg-red-950 [.dark_&]:text-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!formValid || loading}
                className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-base font-black text-white shadow-lg shadow-blue-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none [.dark_&]:disabled:from-slate-700 [.dark_&]:disabled:to-slate-700 [.dark_&]:disabled:text-slate-400"
              >
                {loading ? "Genero il PDF..." : "Scarica PDF"}
              </button>

              <p className="m-0 mt-3 text-center text-[11px] font-medium leading-snug text-slate-500 [.dark_&]:text-slate-400">
                Accetti la{" "}
                <Link href="/privacy-policy" className="font-bold text-[#2b7fff] underline-offset-2 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function normalizePhone(value: string) {
  return value.replace(/\D+/g, "");
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}
