"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const SLOT_MINUTES = 60;
const SLOT_MS = SLOT_MINUTES * 60000;

type ApiTutor = { id: string; displayName?: string | null; email?: string | null };
type ApiBlock = { starts_at: string; ends_at: string };
type ApiBooked = { starts_at: string; ends_at: string };

type SlotItem = {
  id: string;
  startMs: number;
  timeLabel: string;
  status: "available" | "booked";
};

type CalendarDay = {
  id: string;
  dayNumber: number;
  inCurrentMonth: boolean;
};

function ymd(d: Date | string | number | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmdDate(value?: string | null) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatMinutesToTime(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const capped = Math.min(24 * 60, safe);
  const h = Math.floor(capped / 60);
  const m = capped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildCalendarMonth(monthStart: Date, weeks = 6): CalendarDay[] {
  const firstDay = new Date(monthStart);
  firstDay.setDate(1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday=0
  const gridStart = new Date(firstDay);
  gridStart.setDate(1 - startWeekday);

  const days: CalendarDay[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const id = ymd(d);
    if (!id) continue;
    days.push({
      id,
      dayNumber: d.getDate(),
      inCurrentMonth: d.getMonth() === monthStart.getMonth(),
    });
  }
  return days;
}

function formatDayLabel(value?: string | null) {
  const date = parseYmdDate(value);
  if (!date) return null;
  return date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export default function PrenotaPage() {
  const searchParams = useSearchParams();
  const tutorEmail = String(searchParams?.get("email") || "").trim();

  const [tutor, setTutor] = useState<ApiTutor | null>(null);
  const [blocks, setBlocks] = useState<ApiBlock[]>([]);
  const [booked, setBooked] = useState<ApiBooked[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedSlotStartMs, setSelectedSlotStartMs] = useState<number | null>(null);

  const [fullName, setFullName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [note, setNote] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingSaving, setBookingSaving] = useState(false);

  const fetchCalendar = useCallback(async () => {
    if (!tutorEmail) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/public/tutor-calendar?email=${encodeURIComponent(tutorEmail)}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setTutor(data?.tutor || null);
      setBlocks(Array.isArray(data?.blocks) ? data.blocks : []);
      setBooked(Array.isArray(data?.booked) ? data.booked : []);
    } catch (err: any) {
      setTutor(null);
      setBlocks([]);
      setBooked([]);
      setLoadError(err?.message || "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [tutorEmail]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const slotsByDay = useMemo(() => {
    const daySlots = new Map<string, Map<number, SlotItem>>();
    const bookedIntervals = (booked || [])
      .map((b) => {
        const startMs = new Date(b.starts_at).getTime();
        const endMs = new Date(b.ends_at).getTime();
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
          return null;
        }
        return { startMs, endMs };
      })
      .filter(Boolean) as Array<{ startMs: number; endMs: number }>;
    const nowMs = Date.now();

    (blocks || []).forEach((block) => {
      const startMs = new Date(block.starts_at).getTime();
      const endMs = new Date(block.ends_at).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;
      for (let ts = startMs; ts + SLOT_MS <= endMs; ts += SLOT_MS) {
        if (ts < nowMs) continue;
        const slotEnd = ts + SLOT_MS;
        const overlapsBooked = bookedIntervals.some((b) => b.startMs < slotEnd && b.endMs > ts);
        const d = new Date(ts);
        const dayId = ymd(d);
        if (!dayId) continue;
        const timeLabel = formatMinutesToTime(d.getHours() * 60 + d.getMinutes());
        const status: SlotItem["status"] = overlapsBooked ? "booked" : "available";

        const mapForDay = daySlots.get(dayId) || new Map<number, SlotItem>();
        const existing = mapForDay.get(ts);
        if (!existing || (existing.status === "available" && status === "booked")) {
          mapForDay.set(ts, {
            id: `${dayId}-${ts}`,
            startMs: ts,
            timeLabel,
            status,
          });
        }
        daySlots.set(dayId, mapForDay);
      }
    });

    const result = new Map<string, SlotItem[]>();
    for (const [dayId, slotMap] of daySlots.entries()) {
      const list = Array.from(slotMap.values()).sort((a, b) => a.startMs - b.startMs);
      result.set(dayId, list);
    }
    return result;
  }, [blocks, booked]);

  const dayAvailability = useMemo(() => {
    const map = new Map<string, { hasAvailable: boolean }>();
    for (const [dayId, list] of slotsByDay.entries()) {
      map.set(dayId, { hasAvailable: list.some((s) => s.status === "available") });
    }
    return map;
  }, [slotsByDay]);

  const availableDayIds = useMemo(
    () => Array.from(slotsByDay.keys()).sort(),
    [slotsByDay],
  );
  const availableDaySet = useMemo(() => new Set(availableDayIds), [availableDayIds]);

  useEffect(() => {
    if (!availableDayIds.length) {
      setSelectedDayId(null);
      setSelectedSlotStartMs(null);
      return;
    }
    setSelectedDayId((prev) => {
      if (prev && slotsByDay.has(prev)) return prev;
      return availableDayIds[0];
    });
  }, [availableDayIds, slotsByDay]);

  const selectedSlots = useMemo(
    () => (selectedDayId ? slotsByDay.get(selectedDayId) || [] : []),
    [selectedDayId, slotsByDay],
  );

  useEffect(() => {
    if (!selectedSlots.length) {
      setSelectedSlotStartMs(null);
      return;
    }
    setSelectedSlotStartMs((prev) => {
      if (prev && selectedSlots.some((s) => s.startMs === prev)) return prev;
      return null;
    });
  }, [selectedSlots]);

  useEffect(() => {
    setBookingError(null);
    setBookingSuccess(null);
  }, [selectedDayId, selectedSlotStartMs]);

  const minDay = availableDayIds[0] || null;
  const maxDay = availableDayIds[availableDayIds.length - 1] || null;
  const minMonth = minDay ? new Date(parseYmdDate(minDay) || new Date()) : null;
  const maxMonth = maxDay ? new Date(parseYmdDate(maxDay) || new Date()) : null;

  const canGoPrev = useMemo(() => {
    if (!minMonth) return true;
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    return prev >= new Date(minMonth.getFullYear(), minMonth.getMonth(), 1);
  }, [currentMonth, minMonth]);

  const canGoNext = useMemo(() => {
    if (!maxMonth) return true;
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    return next <= new Date(maxMonth.getFullYear(), maxMonth.getMonth(), 1);
  }, [currentMonth, maxMonth]);

  const calendarDays = useMemo(() => buildCalendarMonth(currentMonth), [currentMonth]);

  const monthLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });
    return formatter.format(currentMonth);
  }, [currentMonth]);

  const selectedDayLabel = useMemo(() => formatDayLabel(selectedDayId), [selectedDayId]);

  const formReady = fullName.trim().length > 0 && studentEmail.trim().includes("@");
  const bookingReady = Boolean(selectedSlotStartMs) && formReady;

  const handleBooking = useCallback(async () => {
    setBookingError(null);
    setBookingSuccess(null);
    if (!tutorEmail) {
      setBookingError("Email tutor mancante");
      return;
    }
    if (!selectedSlotStartMs) {
      setBookingError("Seleziona uno slot dal calendario");
      return;
    }
    if (!fullName.trim()) {
      setBookingError("Inserisci il nome");
      return;
    }
    if (!studentEmail.trim() || !studentEmail.includes("@")) {
      setBookingError("Email studente non valida");
      return;
    }
    setBookingSaving(true);
    try {
      const res = await fetch("/api/public/tutor-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorEmail,
          startMs: selectedSlotStartMs,
          fullName: fullName.trim(),
          studentEmail: studentEmail.trim(),
          note: note.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const slotDate = new Date(selectedSlotStartMs);
      const slotTime = formatMinutesToTime(slotDate.getHours() * 60 + slotDate.getMinutes());
      const slotDay = selectedDayId || ymd(slotDate);
      setBookingSuccess(`Slot salvato: ${slotDay} alle ${slotTime}. Ti confermiamo a breve.`);
      setSelectedSlotStartMs(null);
      await fetchCalendar();
    } catch (err: any) {
      setBookingError(err?.message || "Errore prenotazione");
    } finally {
      setBookingSaving(false);
    }
  }, [
    tutorEmail,
    selectedSlotStartMs,
    fullName,
    studentEmail,
    note,
    selectedDayId,
    fetchCalendar,
  ]);

  if (!tutorEmail) {
    return (
      <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl items-start justify-center px-4 py-8 sm:px-8 sm:py-10">
          <div className="relative w-full space-y-4 overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8">
            <h1 className="text-[22px] font-black leading-tight text-slate-900 dark:text-white">
              Link non valido
            </h1>
            <p className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">
              Inserisci la mail del tutor nella query.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              /prenota?email=prof@example.com
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl items-start justify-center px-4 py-8 sm:px-8 sm:py-10">
        <div className="relative w-full space-y-6 overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8">
          <div className="space-y-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Lezione 1h
            </p>
            <h1 className="text-[22px] font-black leading-tight text-slate-900 dark:text-white">
              Prenota una lezione con {tutor?.displayName || tutor?.email || tutorEmail}
            </h1>
            <p className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">
              Seleziona dal calendario e uno slot da 60 minuti.
            </p>
          </div>

          {loadError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700 dark:border-rose-400/50 dark:bg-rose-500/10 dark:text-rose-100">
              {loadError}
            </div>
          ) : null}

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60 sm:p-5">
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[13px] font-bold text-slate-800 shadow-sm dark:bg-slate-900 dark:text-white">
              <button
                type="button"
                onClick={() => {
                  if (!canGoPrev) return;
                  setCurrentMonth((prev) => {
                    const next = new Date(prev);
                    next.setMonth(prev.getMonth() - 1);
                    return next;
                  });
                }}
                disabled={!canGoPrev}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                  canGoPrev
                    ? "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
                    : "border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-700"
                }`}
                aria-label="Mese precedente"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <span className="text-[13px] font-extrabold capitalize">{monthLabel}</span>
              <button
                type="button"
                onClick={() => {
                  if (!canGoNext) return;
                  setCurrentMonth((prev) => {
                    const next = new Date(prev);
                    next.setMonth(prev.getMonth() + 1);
                    return next;
                  });
                }}
                disabled={!canGoNext}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                  canGoNext
                    ? "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
                    : "border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-700"
                }`}
                aria-label="Mese successivo"
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
              {calendarDays.map((day) => {
                const active = selectedDayId === day.id;
                const hasSlots = availableDaySet.has(day.id);
                const dayInfo = dayAvailability.get(day.id) || null;
                const hasAvailable = dayInfo?.hasAvailable ?? false;
                const disabled = !hasSlots;
                const dotClass = hasAvailable
                  ? "bg-emerald-500"
                  : "bg-slate-300 dark:bg-slate-600";
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => !disabled && setSelectedDayId(day.id)}
                    disabled={disabled}
                    className={`flex h-11 w-full flex-col items-center justify-center rounded-lg border text-[12px] font-bold transition py-1 sm:h-12 ${
                      disabled
                        ? "border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-700"
                        : active
                          ? "border-sky-500 bg-sky-50 text-slate-900 shadow-sm dark:border-sky-400 dark:bg-slate-800 dark:text-white"
                          : day.inCurrentMonth
                            ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700"
                    }`}
                  >
                    <span>{day.dayNumber}</span>
                    {hasSlots ? (
                      <span className={`mt-1 h-1.5 w-1.5 rounded-full ${dotClass}`} />
                    ) : (
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-transparent" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDayId ? (
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 capitalize">
                  Orario disponibile per {selectedDayLabel || selectedDayId}
                </p>
                {loading ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    Carico disponibilita...
                  </div>
                ) : null}
                {selectedSlots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selectedSlots.map((slot) => {
                      const disabled = slot.status === "booked" || loading;
                      const active = selectedSlotStartMs === slot.startMs;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => !disabled && setSelectedSlotStartMs(slot.startMs)}
                          className={`w-full rounded-xl border px-3 py-3 text-center text-[14px] font-extrabold transition ${
                            disabled
                              ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600"
                              : active
                                ? "border-sky-500 bg-sky-50 text-slate-900 shadow-sm dark:border-sky-400 dark:bg-slate-800 dark:text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          }`}
                          disabled={disabled}
                        >
                          {slot.timeLabel}
                          {disabled ? (
                            <span className="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Prenotato
                            </span>
                          ) : (
                            <span className="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              1h
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {!loading && selectedSlots.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                    Nessuno slot disponibile in questa data.
                  </div>
                ) : null}
                {!loading &&
                selectedSlots.length > 0 &&
                selectedSlots.every((slot) => slot.status === "booked") ? (
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

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                Nome e cognome
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                Email studente
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            </div>
            <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              Note (opzionale)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={!bookingReady || bookingSaving}
            onClick={handleBooking}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-[15px] font-extrabold transition ${
              bookingReady && !bookingSaving
                ? "border-transparent bg-[linear-gradient(90deg,#1d4ed8,#0ea5e9,#38bdf8)] text-white"
                : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600"
            }`}
          >
            {bookingSaving ? "Prenoto..." : "Prenota lezione"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>

          {bookingError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700 dark:border-rose-400/50 dark:bg-rose-500/10 dark:text-rose-100">
              {bookingError}
            </div>
          ) : null}

          {bookingSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-100">
              {bookingSuccess}
            </div>
          ) : null}

        </div>
      </div>
    </main>
  );
}
