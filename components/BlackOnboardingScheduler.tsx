"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Video,
} from "lucide-react";

const ALLOWED_SLOTS = ["17:00", "17:30", "18:00", "18:30"] as const;
const WEEKDAYS_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const SATURDAY_WEEKDAY = 6; // JS: Saturday

type DayOption = {
  id: string;
  weekday: string;
  day: string;
  month: string;
  note?: string;
  fullLabel: string;
};

type TimeSlot = {
  time: (typeof ALLOWED_SLOTS)[number];
  period: "Mattina" | "Pomeriggio" | "Sera";
};

type CalendarDay = {
  id: string;
  dayNumber: number;
  weekday: number;
  weekdayLabel: string;
  fullLabel: string;
  inCurrentMonth: boolean;
  isAllowed: boolean;
  isPast: boolean;
};

function toIsoDateLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getFirstBookableDate(): Date {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const diff = (SATURDAY_WEEKDAY - base.getDay() + 7) % 7;
  if (diff === 0) return base; // già sabato
  const nextSat = new Date(base);
  nextSat.setDate(base.getDate() + diff);
  return nextSat;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildCalendarMonth(
  monthStart: Date,
  todayStart: Date,
  opts: { weeks?: number } = {},
): CalendarDay[] {
  const weeks = opts.weeks ?? 6;
  const firstDay = new Date(monthStart);
  firstDay.setDate(1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // convert Sun=6, Mon=0
  const gridStart = new Date(firstDay);
  gridStart.setDate(1 - startWeekday);

  const weekdayFmt = new Intl.DateTimeFormat("it-IT", { weekday: "long" });
  const monthFmt = new Intl.DateTimeFormat("it-IT", { month: "long" });

  const days: CalendarDay[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const weekday = d.getDay();
    const weekdayLabel = WEEKDAYS_SHORT[(weekday + 6) % 7];
    const id = d.toISOString().split("T")[0];
    const fullLabel = `${capitalize(weekdayFmt.format(d))} ${d.getDate()} ${capitalize(
      monthFmt.format(d),
    )}`;
    const inCurrentMonth = d.getMonth() === monthStart.getMonth();
    const isPast = d < todayStart;
    const isAllowed = true;
    days.push({
      id,
      dayNumber: d.getDate(),
      weekday,
      weekdayLabel,
      fullLabel,
      inCurrentMonth,
      isAllowed,
      isPast,
    });
  }
  return days;
}

function createTimeSlots(): TimeSlot[] {
  return ALLOWED_SLOTS.map((time) => {
    const [h] = time.split(":").map((v) => parseInt(v, 10));
    const period: TimeSlot["period"] =
      h < 13 ? "Mattina" : h < 17 ? "Pomeriggio" : "Sera";
    return { time, period };
  });
}

export default function BlackOnboardingScheduler() {
  const { user } = useAuth();
  const timeSlots = useMemo(() => createTimeSlots(), []);
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const firstBookable = useMemo(() => getFirstBookableDate(), []);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const calendarDays = useMemo(
    () => buildCalendarMonth(currentMonth, todayStart),
    [currentMonth, todayStart],
  );
  const hasSelectableDays = useMemo(
    () => calendarDays.some((day) => day.id >= toIsoDateLocal(firstBookable) && !day.isPast),
    [calendarDays, firstBookable],
  );
  const [selectedDay, setSelectedDay] = useState<DayOption | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [statusDetail, setStatusDetail] = useState<string>(
    "Step 1: scegli una data disponibile a partire da sabato.",
  );
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const mail =
      (user as { email?: string | null })?.email ||
      (user as { displayName?: string | null })?.displayName ||
      "";
    if (mail) setEmail(mail);
  }, [user]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDay) return;
      setLoadingSlots(true);
      try {
        const res = await fetch(`/api/black-onboarding/book?date=${selectedDay.id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok) {
          setBookedSlots(Array.isArray(data?.booked) ? data.booked : []);
          setStatus("idle");
          setStatusDetail("Step 1: scegli uno slot tra 17:00 e 18:30.");
        } else {
          setBookedSlots([]);
          setStatus("error");
          setStatusDetail(data?.error || "Impossibile caricare disponibilità.");
        }
      } catch (err: any) {
        setBookedSlots([]);
        setStatus("error");
        setStatusDetail(err?.message || "Errore rete.");
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchAvailability();
  }, [selectedDay]);

  const handleConfirm = async () => {
    if (!selectedDay || !selectedSlot) {
      setStatus("error");
      setStatusDetail("Completa data e orario.");
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      setStatus("error");
      setStatusDetail("Inserisci nome e email.");
      return;
    }

    try {
      setSubmitting(true);
      setStatus("idle");
      setStatusDetail("Invio in corso...");
      const res = await fetch("/api/black-onboarding/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDay.id,
          time: selectedSlot,
          name: fullName.trim(),
          email: email.trim(),
          note: note.trim(),
          account: {
            uid: (user as any)?.uid || null,
            email: (user as any)?.email || null,
            displayName: (user as any)?.displayName || null,
            username: (user as any)?.username || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setStatusDetail(data?.error || "Errore prenotazione.");
        if (data?.booked) setBookedSlots(data.booked);
        if (res.status === 409) setSelectedSlot(null);
        return;
      }
      setStatus("success");
      setStatusDetail(
        `Slot confermato per ${selectedDay.fullLabel} alle ${selectedSlot}. Ti scriveremo per il link.`,
      );
      setShowSuccess(true);
      setBookedSlots((prev) =>
        prev.includes(selectedSlot || "") ? prev : [...prev, selectedSlot || ""],
      );
    } catch (err: any) {
      setStatus("error");
      setStatusDetail(err?.message || "Errore rete.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusMessage = statusDetail;

  if (showSuccess) {
    return (
      <section className="min-h-dvh bg-background text-foreground">
        <div className="mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center gap-4 px-5 py-12">
          <div className="w-full rounded-2xl border border-slate-200 bg-white/95 p-6 text-center shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xl font-black text-slate-900 dark:text-white">Prenotazione inviata</p>
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Ti scriveremo con il link della call. Se devi modificare qualcosa, apri la chat Black.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/account"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Torna al tuo account
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-12 lg:flex-row lg:py-16">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:w-[280px]">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <CalendarClock className="h-4 w-4" aria-hidden />
            Onboarding Black
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-black text-slate-900 dark:text-white">Call di benvenuto</p>
            <div className="flex flex-wrap gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                <Clock3 className="h-4 w-4" aria-hidden />
                30 min
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                <Video className="h-4 w-4" aria-hidden />
                Video call
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between pb-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {step === 1 ? "Step 1 di 2 — Data e orario" : "Step 2 di 2 — Dati"}
            </div>
            {step === 2 && (
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setStatus("idle");
                  setStatusDetail("Step 1: scegli una data disponibile a partire da sabato.");
                }}
                className="text-xs font-semibold text-slate-600 underline underline-offset-4 hover:text-slate-800"
              >
                Indietro
              </button>
            )}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Seleziona data (da sabato in poi)
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {currentMonth.toLocaleString("it-IT", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Mese precedente"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/70"
                        onClick={() =>
                          setCurrentMonth((prev) =>
                            new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                          )
                        }
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Mese successivo"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/70"
                        onClick={() =>
                          setCurrentMonth((prev) =>
                            new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                          )
                        }
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 text-center text-[12px] font-semibold text-slate-500 dark:text-slate-300">
                    {WEEKDAYS_SHORT.map((day) => (
                      <div key={day} className="py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-sm">
                    {calendarDays.map((day) => {
                      const isSelected = selectedDay?.id === day.id;
                      const minAllowed = day.id >= toIsoDateLocal(firstBookable);
                      const disabled = !minAllowed || day.isPast;
                      return (
                        <button
                          key={day.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            setSelectedDay({
                              id: day.id,
                              weekday: day.weekdayLabel,
                              day: String(day.dayNumber).padStart(2, "0"),
                              month: currentMonth.toLocaleString("it-IT", { month: "short" }),
                              fullLabel: day.fullLabel,
                            });
                            setSelectedSlot(null);
                            setStatus("idle");
                            setStatusDetail("Scegli uno slot tra 17:00 e 18:30.");
                          }}
                          className={`relative flex h-12 flex-col items-center justify-center rounded-xl border text-[13px] font-semibold transition ${
                            disabled
                              ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600"
                              : isSelected
                                ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-900"
                                : day.inCurrentMonth
                                  ? "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:text-white dark:hover:border-slate-700"
                                  : "border-slate-100 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-500"
                          }`}
                        >
                          <span>{day.dayNumber}</span>
                          {!disabled && (
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {!hasSelectableDays && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                      Nessuna data disponibile. Torna sabato per aprire nuovi slot.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Seleziona orario (30 minuti)
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedDay ? selectedDay.fullLabel : "Scegli prima una data."}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Video className="h-4 w-4" aria-hidden />
                      Video call
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-2">
                    {selectedDay ? (
                      timeSlots.map((slot) => {
                        const isSelected = selectedSlot === slot.time;
                        const isBooked = bookedSlots.includes(slot.time);
                        const disabled = isBooked;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => {
                              if (disabled) return;
                              setSelectedSlot(slot.time);
                              setStatus("idle");
                              setStatusDetail("Premi continua per inserire i dati.");
                            }}
                            disabled={disabled}
                            aria-pressed={isSelected}
                            className={`group flex h-full flex-col justify-between rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                              disabled
                                ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600"
                                : isSelected
                                  ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-900"
                                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:text-white dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-base font-bold">{slot.time}</p>
                              {isBooked ? (
                                <span className="rounded-full bg-slate-200 px-2 py-[2px] text-[11px] font-semibold text-slate-700">
                                  Prenotato
                                </span>
                              ) : (
                                <span
                                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                                    isSelected ? "text-slate-200" : "text-slate-500"
                                  }`}
                                >
                                  30 min
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="col-span-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 sm:col-span-2">
                        Seleziona una data per vedere gli slot disponibili.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className={`text-sm font-semibold ${
                    status === "error"
                      ? "text-amber-700 dark:text-amber-400"
                      : status === "success"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {loadingSlots ? "Carico gli slot..." : statusMessage}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedDay || !selectedSlot) {
                      setStatus("error");
                      setStatusDetail("Seleziona data e orario.");
                      return;
                    }
                    setStep(2);
                    setStatus("idle");
                    setStatusDetail("Inserisci i tuoi dati e conferma.");
                  }}
                  disabled={!selectedDay || !selectedSlot}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold transition ${
                    !selectedDay || !selectedSlot
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  Continua
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  I tuoi dati
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedDay && selectedSlot
                    ? `${selectedDay.fullLabel} alle ${selectedSlot}`
                    : "Completa data e orario."}
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Nome e cognome
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-0 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      placeholder="Es. Mario Rossi"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-0 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      placeholder="nome@email.it"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Nota (opzionale)
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-0 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      placeholder="Difficoltà principali (es. integrali, trigonometria, fisica)"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className={`text-sm font-semibold ${
                    status === "error"
                      ? "text-amber-700 dark:text-amber-400"
                      : status === "success"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {loadingSlots ? "Carico gli slot..." : statusMessage}
                </div>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting || loadingSlots}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold text-white transition ${
                    submitting || loadingSlots
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {submitting ? "Invio..." : "Conferma"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
