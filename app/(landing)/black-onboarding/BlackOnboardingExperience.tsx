"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

type Step = 1 | 2 | 3 | 4 | 5;
type BurstPiece = {
  dxStart: string;
  dyStart: string;
  dxEnd: string;
  dyEnd: string;
  color: string;
  delay: number;
  rot: string;
  size: number;
};

const ALLOWED_SLOTS = ["17:00", "17:30", "18:00", "18:30", "19:00"] as const;

export default function BlackOnboardingExperience() {
  const [step, setStep] = useState<Step>(1);
  const [nome, setNome] = useState("");
  const [classe, setClasse] = useState("");
  const [videoEnded, setVideoEnded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [finalConfetti, setFinalConfetti] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingDone, setBookingDone] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookedIntervals, setBookedIntervals] = useState<{ start: number; end: number }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const { user } = useAuth();
  const [bookingError, setBookingError] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d;
  }, [today]);

  const formReady = nome.trim().length > 0 && classe.trim().length > 0;
  const bookingReady = !!selectedDay && !!selectedSlot && !bookingDone;

  const monthLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });
    return formatter.format(currentMonth);
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    const formatterMonth = new Intl.DateTimeFormat("it-IT", { month: "short" });
    const firstDay = new Date(currentMonth);
    const startWeekday = (firstDay.getDay() + 6) % 7; // lun=0
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startWeekday);
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const id = d.toISOString().split("T")[0];
      const inPastOrToday = d <= today;
      const beyondMax = d > maxDate;
      const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
      days.push({
        id,
        dayNumber: d.getDate(),
        monthLabel: formatterMonth.format(d).replace(".", ""),
        isDisabled: inPastOrToday || beyondMax,
        isCurrentMonth,
      });
    }
    return days;
  }, [currentMonth, maxDate, today]);

  const buildBurst = (palette: string[]) => {
    const pieces: BurstPiece[] = [];
    const total = 70;
    for (let i = 0; i < total; i++) {
      const angle = (Math.PI * 2 * i) / total + Math.random() * 0.5;
      const baseDistance = 220 + Math.random() * 200;
      const dx = Math.cos(angle) * baseDistance;
      const dy = Math.sin(angle) * baseDistance;
      const startFactor = 0.35;
      const endFactor = 1.35;
      pieces.push({
        dxStart: `${(dx * startFactor).toFixed(1)}px`,
        dyStart: `${(dy * startFactor).toFixed(1)}px`,
        dxEnd: `${(dx * endFactor).toFixed(1)}px`,
        dyEnd: `${(dy * endFactor).toFixed(1)}px`,
        color: palette[i % palette.length],
        delay: Math.random() * 0.12,
        rot: `${Math.random() * 260 - 130}deg`,
        size: 6 + Math.random() * 9,
      });
    }
    return pieces;
  };

  const burstPieces = useMemo(
    () => buildBurst(["#1d4ed8", "#0ea5e9", "#38bdf8", "#67e8f9"]),
    [],
  );
  const finalBurstPieces = useMemo(
    () => buildBurst(["#1d4ed8", "#38bdf8", "#ef4444", "#f97316"]),
    [],
  );

  useEffect(() => {
    if (step !== 2) return;
    setVideoEnded(false);
    const timer = setTimeout(() => setVideoEnded(true), 25000);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step === 3) {
      setBookingDone(false);
      setBookingSubmitting(false);
      setSelectedDay(null);
      setSelectedSlot(null);
      setBookedIntervals([]);
      setFinalConfetti(false);
    }
  }, [step]);

  useEffect(() => {
    setMounted(true);
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 2600);
    return () => clearTimeout(t);
  }, []);

  const toMinutes = useCallback((time: string) => {
    const [h, m] = time.split(":").map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }, []);

  const extractIntervals = useCallback(
    (raw: any[]): { start: number; end: number }[] => {
      const intervals: { start: number; end: number }[] = [];
      for (const item of raw) {
        const time = typeof item === "string" ? item : item?.time || item?.start || item?.slot;
        const duration =
          typeof item === "object" && item
            ? Number(item.durationMinutes || item.duration || item.length || 0)
            : 0;
        const callType =
          typeof item === "object" && item ? String(item.callType || item.type || "") : "";
        const guessedDuration = duration > 0 ? duration : callType.includes("check") ? 20 : 30;
        const start = typeof time === "string" ? toMinutes(time) : null;
        if (start !== null) intervals.push({ start, end: start + guessedDuration });
      }
      return intervals;
    },
    [toMinutes],
  );

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDay) return;
      setLoadingSlots(true);
      try {
        const res = await fetch(`/api/black-onboarding/book?date=${selectedDay}&type=all`, {
          cache: "no-store",
        });
        const data = await res.json();
        const raw = Array.isArray(data?.booked) ? data.booked : [];
        setBookedIntervals(res.ok ? extractIntervals(raw) : []);
      } catch {
        setBookedIntervals([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchAvailability();
  }, [selectedDay, extractIntervals]);

  const canGoPrev = useMemo(() => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    return prev >= new Date(today.getFullYear(), today.getMonth(), 1);
  }, [currentMonth, today]);

  const canGoNext = useMemo(() => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    return next <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  }, [currentMonth, maxDate]);

  const goPrevMonth = () => {
    if (!canGoPrev) return;
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonth(prev);
    setSelectedDay(null);
    setSelectedSlot(null);
    setBookedIntervals([]);
  };

  const goNextMonth = () => {
    if (!canGoNext) return;
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
    setSelectedDay(null);
    setSelectedSlot(null);
    setBookedIntervals([]);
  };

  const isSlotDisabled = (slot: string) => {
    const start = toMinutes(slot) || 0;
    const end = start + 30;
    return bookedIntervals.some((b) => start < b.end && b.start < end);
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="space-y-5">
          <h1 className="text-[26px] font-black leading-tight text-slate-900 dark:text-white">
            Benvenuto su Theoremz Black 🎉
          </h1>
          <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">
            Inserisci nome e classe per iniziare
          </p>

          <input
            id="onb-nome"
            name="onb-nome"
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-sky-400 dark:focus:ring-slate-700"
            placeholder="Nome"
          />

          <input
            id="onb-classe"
            name="onb-classe"
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400 dark:focus:ring-slate-700"
            placeholder="Classe"
          />

          <button
            type="button"
            disabled={!formReady}
            onClick={() => setStep(2)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-[15px] font-extrabold transition ${
              formReady
                ? "border-transparent bg-[linear-gradient(90deg,#1d4ed8,#0ea5e9,#38bdf8)] text-white"
                : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600"
            }`}
          >
            Inizia ora
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-5">
          <h1 className="text-[22px] font-black leading-tight text-slate-900 dark:text-white">
            Video introduttivo
          </h1>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-800">
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full brightness-[1.15] saturate-110"
                src="https://www.youtube.com/embed/l-Bz45nw3Ns?rel=0&modestbranding=1&playsinline=1&autoplay=1&controls=0&disablekb=1&fs=0"
                title="Onboarding Black"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            {!videoEnded ? (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-white/0" />
            ) : null}
          </div>

          <button
            type="button"
            disabled={!videoEnded}
            onClick={() => videoEnded && setStep(3)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-[15px] font-extrabold transition ${
              videoEnded
                ? "border-transparent bg-[linear-gradient(90deg,#1d4ed8,#0ea5e9,#38bdf8)] text-white"
                : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600"
            }`}
          >
            Prenota la chiamata
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-5">
          <h1 className="text-[22px] font-black leading-tight text-slate-900 dark:text-white">
            Prenota la chiamata di onboarding
          </h1>
          <p className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">
            Seleziona dal calendario e uno slot da 30 minuti.
          </p>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60 sm:p-5">
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[13px] font-bold text-slate-800 shadow-sm dark:bg-slate-900 dark:text-white">
              <button
                type="button"
                onClick={goPrevMonth}
                disabled={!canGoPrev}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                  canGoPrev
                    ? "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
                    : "border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-700"
                }`}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <span className="text-[13px] font-extrabold capitalize">{monthLabel}</span>
              <button
                type="button"
                onClick={goNextMonth}
                disabled={!canGoNext}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                  canGoNext
                    ? "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
                    : "border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-700"
                }`}
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 rounded-xl bg-white p-2 dark:bg-slate-900">
              {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 sm:text-[11px]"
                >
                  {d}
                </div>
              ))}
              {calendarDays.map((d) => {
                const active = selectedDay === d.id;
                const disabled = d.isDisabled;
                const isAvailable = !disabled;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => !disabled && setSelectedDay(d.id)}
                    disabled={disabled}
                    className={`flex h-11 w-full flex-col items-center justify-center rounded-lg border text-[12px] font-bold transition py-1 sm:h-12 ${
                      disabled
                        ? "border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-700"
                        : active
                          ? "border-sky-500 bg-sky-50 text-slate-900 shadow-sm dark:border-sky-400 dark:bg-slate-800 dark:text-white"
                          : d.isCurrentMonth
                            ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700"
                    }`}
                  >
                    <span>{d.dayNumber}</span>
                    {isAvailable ? (
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-transparent" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDay ? (
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                  Orario disponibile per {selectedDay}
                </p>
                {loadingSlots ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    Carico disponibilità...
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ALLOWED_SLOTS.map((slot) => {
                    const disabled = isSlotDisabled(slot) || loadingSlots;
                    const active = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => !disabled && setSelectedSlot(slot)}
                        className={`w-full rounded-xl border px-3 py-3 text-center text-[14px] font-extrabold transition ${
                          disabled
                            ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600"
                            : active
                              ? "border-sky-500 bg-sky-50 text-slate-900 shadow-sm dark:border-sky-400 dark:bg-slate-800 dark:text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        }`}
                        disabled={disabled}
                      >
                        {slot}
                        {disabled ? (
                          <span className="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Prenotato
                          </span>
                        ) : (
                          <span className="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            30 min
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {!loadingSlots &&
                bookedIntervals.length > 0 &&
                ALLOWED_SLOTS.every((slot) => {
                  const start = toMinutes(slot) || 0;
                  const end = start + 30;
                  return bookedIntervals.some((b) => start < b.end && b.start < end);
                }) ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                    Nessuno slot disponibile in questa data.
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">
                Seleziona un giorno per vedere gli orari disponibili.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={!bookingReady || bookingSubmitting}
            onClick={async () => {
              if (!bookingReady || bookingSubmitting || !selectedDay || !selectedSlot) return;
              setBookingError(null);
              setBookingSubmitting(true);
              const wait = new Promise((res) => setTimeout(res, 500));
              const body = {
                date: selectedDay,
                time: selectedSlot,
                name: nome || (user as any)?.displayName || "",
                email: (user as any)?.email || "",
                note: classe || "",
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                account: user
                  ? {
                      uid: (user as any)?.uid || null,
                      email: (user as any)?.email || null,
                      displayName: (user as any)?.displayName || null,
                      username: (user as any)?.username || null,
                    }
                  : null,
                callType: "onboarding",
                callDurationMinutes: 30,
              };

              try {
                const res = await Promise.all([
                  fetch("/api/black-onboarding/book", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  }),
                  wait,
                ]).then(([response]) => response);

                const data = await res.json();
                if (!res.ok || !data?.ok) {
                  setBookingError(data?.error || "Errore prenotazione.");
                  return;
                }

                setBookingDone(true);
                setBookingSubmitting(false);
                setStep(4);
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
                setFinalConfetti(true);
              } catch (err: any) {
                setBookingError(err?.message || "Errore di rete.");
              } finally {
                setBookingSubmitting(false);
              }
            }}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-[15px] font-extrabold transition ${
              bookingReady && !bookingSubmitting
                ? "border-transparent bg-[linear-gradient(90deg,#1d4ed8,#0ea5e9,#38bdf8)] text-white"
                : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600"
            }`}
          >
            {bookingSubmitting ? "Prenoto..." : bookingDone ? "Prenotato" : "Prenota chiamata"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>

          {bookingError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700 dark:border-rose-400/50 dark:bg-rose-500/10 dark:text-rose-100">
              {bookingError}
            </div>
          ) : null}

          {bookingDone && selectedDay && selectedSlot ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-100">
              Slot salvato: {selectedDay} alle {selectedSlot}. Ti confermiamo a breve.
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <h1 className="text-[24px] font-black leading-tight text-slate-900 dark:text-white">
          🔥 Grande, hai iniziato il tuo percorso di miglioramento in matematica!
        </h1>
        <ol className="space-y-2 text-[14px] font-semibold text-slate-700 dark:text-slate-200">
          <li>1. La tua chiamata è programmata.</li>
          <li>2. Ti seguirò io personalmente.</li>
          <li>3. Prima della call puoi:</li>
        </ol>
        <div className="space-y-3">
          <Link
            href="/account"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-extrabold text-slate-900 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            👉 Studiare sul sito (vai al tuo account)
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <a
            href="https://wa.me/393520646070"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-extrabold text-slate-900 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            👉 Mandarmi un dubbio su WhatsApp
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <button
            type="button"
            onClick={() => setStep(5)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-[14px] font-extrabold text-slate-900 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            👉 Sono un genitore
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  };

  if (step === 5) {
    return (
      <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl items-start justify-center px-4 py-8 sm:px-8 sm:py-10">
          <div className="relative w-full space-y-6 overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8">
            <h1 className="text-[24px] font-black leading-tight text-slate-900 dark:text-white">
              Info per i genitori
            </h1>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-800">
              <div className="aspect-video w-full">
                <iframe
                  className="h-full w-full brightness-[1.1] saturate-110"
                  src="https://www.youtube.com/embed/0u9pXl8jQuE?rel=0&modestbranding=1&playsinline=1&autoplay=1&controls=0&disablekb=1&fs=0"
                  title="Genitori Onboarding"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-[linear-gradient(90deg,#1d4ed8,#0ea5e9,#38bdf8)] px-5 py-3 text-[15px] font-extrabold text-white transition"
            >
              Torna alle indicazioni
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes popFadeIn {
              0% { opacity: 1; transform: translateY(18px) scale(0.98); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes confettiBurst {
              0% { opacity: 0; transform: translate(calc(-50% + var(--dx-start)), calc(-50% + var(--dy-start))) scale(0.6) rotate(0deg); }
              12% { opacity: 1; transform: translate(calc(-50% + var(--dx-start)), calc(-50% + var(--dy-start))) scale(0.9) rotate(10deg); }
              60% { opacity: 0.9; }
              80% { opacity: 0; }
              100% { opacity: 0; transform: translate(calc(-50% + var(--dx-end)), calc(-50% + var(--dy-end))) rotate(var(--rot)) scale(1.2); }
            }
          `,
        }}
      />
      {showConfetti ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          {burstPieces.map((p, idx) => (
            <span
              key={idx}
              className="absolute left-1/2 block rounded-sm"
              style={{
                top: "32%",
                width: p.size,
                height: p.size * 2,
                backgroundColor: p.color,
                animation: "confettiBurst 2s ease-out forwards",
                animationDelay: `${p.delay}s`,
                ["--dx-start" as string]: p.dxStart,
                ["--dy-start" as string]: p.dyStart,
                ["--dx-end" as string]: p.dxEnd,
                ["--dy-end" as string]: p.dyEnd,
                ["--rot" as string]: p.rot,
              }}
            />
          ))}
        </div>
      ) : null}
      {finalConfetti ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          {finalBurstPieces.map((p, idx) => (
            <span
              key={`final-${idx}`}
              className="absolute left-1/2 block rounded-sm"
              style={{
                top: "32%",
                width: p.size,
                height: p.size * 2,
                backgroundColor: p.color,
                animation: "confettiBurst 2s ease-out forwards",
                animationDelay: `${p.delay}s`,
                ["--dx-start" as string]: p.dxStart,
                ["--dy-start" as string]: p.dyStart,
                ["--dx-end" as string]: p.dxEnd,
                ["--dy-end" as string]: p.dyEnd,
                ["--rot" as string]: p.rot,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl items-start justify-center px-4 py-8 sm:px-8 sm:py-10">
        <div
          className="relative w-full space-y-6 overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8"
          style={{ animation: mounted ? "popFadeIn 0.6s ease-out" : "none" }}
        >
          {renderStepContent()}
        </div>
      </div>
    </main>
  );
}
