/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions */
"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getAuth } from "firebase/auth";
import {
  PlayCircle,
  Timer as TimerIcon,
  FileText,
  ListChecks,
  BookOpen,
  CalendarClock,
  ArrowRight,
  Loader2,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import NewsletterSettings from "@/components/NewsletterSettings";
import TempAccessInfo from "@/components/TempAccessInfo";
import dynamic from "next/dynamic";
const GradesChartRecharts = dynamic(
  () => import("@/components/GradesChartRecharts"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-2 h-[240px] rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900/60 animate-pulse" />
    ),
  }
);
const DEFAULT_CALL_TYPE = "ripetizione";
const DEFAULT_DURATION_MIN = 60;
const AVAIL_DEFAULT_START_HOUR = 8;
const AVAIL_DEFAULT_END_HOUR = 20;
const AVAIL_MAX_GRID_HEIGHT = 360;
const AVAIL_MAX_HOUR_HEIGHT = 48;
const AVAIL_MIN_HOUR_HEIGHT = 12;
const WEEKDAYS_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"] as const;

type TutorStudent = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsappGroupLink?: string | null;
  hoursPaid?: number;
  hoursConsumed?: number;
  remainingPaid?: number;
  isBlack?: boolean;
  hourlyRate?: number | null;
  consumedBaseline?: number | null;
  chargeableHours?: number | null;
};

/* ───────────────── helpers data ───────────────── */
// Normalizza in millisecondi: accetta Date | string ISO | number (ms/sec) | Firestore Timestamp
function toMs(x: any): number | null {
  if (!x) return null;
  if (x instanceof Date) return x.getTime();
  if (typeof x === "string") {
    const ms = Date.parse(x);
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof x === "number") {
    // se è in secondi (tipico di alcuni backend), portalo a ms
    return x < 1e12 ? x * 1000 : x;
  }
  // Firestore Timestamp
  if (typeof x.toDate === "function") return x.toDate().getTime();
  return null;
}

/* ───────────────── Account Page (Blue theme) ───────────────── */

export default function AccountPage() {
  const router = useRouter();
  const {
    user,
    isSubscribed,
    logout: doLogout,
    savedLessons,
    refreshSavedLessons,
  } = useAuth();
  // Mini-streak per header
  const [streak, setStreak] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/me/streak", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json();
        if (typeof json?.count === "number") setStreak(json.count);
      } catch {}
    })();
  }, [user?.uid]);

  // username: lazy init
  const [username, setUsername] = useState<string>(() => {
    const u =
      (user as { username?: string; displayName?: string; email?: string }) ||
      {};
    return u.username || u.displayName || u.email?.split?.("@")[0] || "";
  });
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState<"idle" | "ok" | "err">(
    "idle"
  );

  const friendlyName = useMemo(() => {
    const u =
      (user as { username?: string; displayName?: string; email?: string }) ||
      {};
    return u.username || u.displayName || u.email?.split?.("@")[0] || "utente";
  }, [user]);

  // Fetch subscription start date from Stripe
  const [subscriptionStartMs, setSubscriptionStartMs] = useState<number | null>(
    null
  );
  const [planTier, setPlanTier] = useState<"Essential" | "Black" | null>(null);
  const [planLabel, setPlanLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!isSubscribed || !user?.uid) return;

    const fetchSubscriptionInfo = async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;

        const res = await fetch("/api/subscription-info", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const data = await res.json();
        console.log("📅 Subscription info:", data);
        if (data.subscribed && data.startDate) {
          const ms = new Date(data.startDate).getTime();
          console.log("📅 Setting subscription start:", new Date(ms));
          setSubscriptionStartMs(ms);
          const tier =
            typeof data.planTier === "string" &&
            data.planTier.toLowerCase().includes("essential")
              ? "Essential"
              : typeof data.planLabel === "string" &&
                  data.planLabel.toLowerCase().includes("essential")
                ? "Essential"
                : "Black";
          setPlanTier(tier as "Essential" | "Black");
          if (tier === "Essential") {
            setPlanLabel("Essential");
          } else if (data.planLabel && typeof data.planLabel === "string") {
            setPlanLabel(data.planLabel);
          }
        }
      } catch (error) {
        console.error("Errore caricamento info abbonamento:", error);
      }
    };

    fetchSubscriptionInfo();
  }, [isSubscribed, user?.uid]);

  /* ------------ FIX robusto per subscriptionSince / daysSubscribed ------------ */
  // 1) Normalizza qualsiasi cosa tu abbia in user.createdAt
  const subscriptionSinceMs = subscriptionStartMs;

  // 2) Deriva Date (se serve per il rendering) e giorni
  const subscriptionSince = useMemo(
    () => (subscriptionSinceMs ? new Date(subscriptionSinceMs) : null),
    [subscriptionSinceMs]
  );

  const daysSubscribed = useMemo(() => {
    if (!isSubscribed || !subscriptionSinceMs) return null;
    const diffDays =
      Math.floor((Date.now() - subscriptionSinceMs) / 86_400_000) + 1; // inclusivo del primo giorno
    return Math.max(1, diffDays);
  }, [isSubscribed, subscriptionSinceMs]);

  // Formatta la durata dell'abbonamento in modo leggibile
  const subscriptionDuration = useMemo(() => {
    if (!daysSubscribed) return null;

    const days = daysSubscribed;
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const weeks = Math.floor((days % 30) / 7);
    const remainingDays = days % 7;

    if (years > 0) {
      return months > 0 ? `${years}a ${months}m` : `${years}a`;
    }
    if (months > 0) {
      return weeks > 0 ? `${months}m ${weeks}sett` : `${months}m`;
    }
    if (weeks > 0) {
      return remainingDays > 0
        ? `${weeks}sett ${remainingDays}g`
        : `${weeks}sett`;
    }
    return `${days}g`;
  }, [daysSubscribed]);

  const subscriptionStartDate = useMemo(() => {
    if (!subscriptionSince) return null;
    return subscriptionSince.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [subscriptionSince]);
  /* --------------------------------------------------------------------------- */

  const planDisplayLabel = useMemo(() => {
    if (!isSubscribed) return "Free";
    const labels = [planLabel, planTier].filter(Boolean) as string[];
    const isEssentialPlan = labels.some((l) =>
      l.toLowerCase().includes("essential")
    );
    if (isEssentialPlan) return "Essential";
    return labels[0] || "Black";
  }, [isSubscribed, planLabel, planTier]);

  const [weeklyCheck, setWeeklyCheck] = useState<{
    hasBooking: boolean;
    startsAt: string | null;
  } | null>(null);
  const [weeklyCheckLoading, setWeeklyCheckLoading] = useState(false);
  const [weeklyCheckError, setWeeklyCheckError] = useState<string | null>(null);

  const [nextBooking, setNextBooking] = useState<{
    hasBooking: boolean;
    startsAt: string | null;
    callTypeName?: string | null;
  } | null>(null);
  const [nextBookingLoading, setNextBookingLoading] = useState(false);
  const [nextBookingError, setNextBookingError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchWeeklyCheck = async () => {
      if (!isSubscribed || planTier !== "Black" || !user?.uid) {
        setWeeklyCheck(null);
        setWeeklyCheckError(null);
        setWeeklyCheckLoading(false);
        return;
      }
      setWeeklyCheckLoading(true);
      setWeeklyCheckError(null);
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Token non disponibile");
        const res = await fetch("/api/me/weekly-check-call", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.ok) {
          setWeeklyCheck({
            hasBooking: Boolean(data?.hasBooking),
            startsAt: data?.booking?.startsAt || null,
          });
        } else {
          setWeeklyCheckError(data?.error || "Errore verifica call");
          setWeeklyCheck(null);
        }
      } catch (err: any) {
        if (active) {
          const detail = err?.message || "Errore rete";
          setWeeklyCheckError(detail);
          setWeeklyCheck(null);
        }
      } finally {
        if (active) setWeeklyCheckLoading(false);
      }
    };
    fetchWeeklyCheck();
    return () => {
      active = false;
    };
  }, [isSubscribed, planTier, user?.uid]);

  useEffect(() => {
    let active = true;
    const fetchNextBooking = async () => {
      if (!user?.uid) {
        setNextBooking(null);
        setNextBookingError(null);
        setNextBookingLoading(false);
        return;
      }
      setNextBookingLoading(true);
      setNextBookingError(null);
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Token non disponibile");
        const res = await fetch("/api/me/next-booking", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.ok) {
          setNextBooking({
            hasBooking: Boolean(data?.hasBooking),
            startsAt: data?.booking?.startsAt || null,
            callTypeName:
              data?.booking?.callTypeName || data?.booking?.callType || null,
          });
        } else {
          setNextBooking(null);
          setNextBookingError(data?.error || "Errore prenotazione");
        }
      } catch (err: any) {
        if (active) {
          setNextBooking(null);
          setNextBookingError(err?.message || "Errore rete");
        }
      } finally {
        if (active) setNextBookingLoading(false);
      }
    };
    fetchNextBooking();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  // Tutor: se l'utente è un tutor, mostra il calendario delle sue prenotazioni
  const [tutorMode, setTutorMode] = useState<"tutor" | "none">("none");
  const [tutorData, setTutorData] = useState<{
    bookings: any[];
    callTypes: any[];
    tutorName?: string | null;
    hoursDue?: number | null;
    students?: TutorStudent[];
  } | null>(null);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"create" | "edit">("create");
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [scheduleStudentId, setScheduleStudentId] = useState<string>("");
  const [scheduleDate, setScheduleDate] = useState(() => ymd(new Date()));
  const [scheduleTime, setScheduleTime] = useState("15:00");
  const [scheduleCallType, setScheduleCallType] = useState<string | null>(
    DEFAULT_CALL_TYPE
  );
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [schedulePast, setSchedulePast] = useState(false);
  useEffect(() => {
    if (Array.isArray(tutorData?.callTypes) && tutorData.callTypes[0]?.slug) {
      setScheduleCallType(DEFAULT_CALL_TYPE);
    }
  }, [tutorData?.callTypes]);
  // Disponibilità tutor
  const [availFrom, setAvailFrom] = useState(() => ymd(new Date()));
  const [availTo, setAvailTo] = useState(() => ymd(new Date()));
  const [availStart, setAvailStart] = useState("09:00");
  const [availEnd, setAvailEnd] = useState("18:00");
  const [availDays, setAvailDays] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4])
  ); // lun-ven
  const [availSaving, setAvailSaving] = useState(false);
  const [availMsg, setAvailMsg] = useState<string | null>(null);
  const [showAddAvail, setShowAddAvail] = useState(false);
  const [availSlots, setAvailSlots] = useState<any[]>([]);
  const [availSlotsLoading, setAvailSlotsLoading] = useState(false);
  const [availDeleteMsg, setAvailDeleteMsg] = useState<string | null>(null);
  const [availDeleteFrom, setAvailDeleteFrom] = useState(() => ymd(new Date()));
  const [availDeleteTo, setAvailDeleteTo] = useState(() => ymd(new Date(Date.now() + 7 * 86400000)));
  const [availDeleteStart, setAvailDeleteStart] = useState("00:00");
  const [availDeleteEnd, setAvailDeleteEnd] = useState("23:59");
  const [availDeleteDays, setAvailDeleteDays] = useState<Set<number>>(new Set());
  const [availCalendarMonth, setAvailCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedAvailDayId, setSelectedAvailDayId] = useState<string | null>(
    null
  );
  const availSlotsByDay = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        id: string;
        label: string;
        startMinutes: number;
        durationMin: number;
        endMinutes: number;
      }>
    >();
    availSlots.forEach((slot) => {
      const slotTs = slot?.starts_at || slot?.startsAt;
      const slotDate = slotTs ? new Date(slotTs) : null;
      if (!slotDate || Number.isNaN(slotDate.getTime())) return;
      const key = ymd(slotDate);
      if (!key) return;
      const durationRaw = Number(
        slot?.duration_min ?? slot?.durationMin ?? DEFAULT_DURATION_MIN
      );
      const durationMin =
        Number.isFinite(durationRaw) && durationRaw > 0
          ? durationRaw
          : DEFAULT_DURATION_MIN;
      const startMinutes = slotDate.getHours() * 60 + slotDate.getMinutes();
      const rawEndMinutes = startMinutes + durationMin;
      const endMinutes = Math.min(24 * 60, Math.max(startMinutes, rawEndMinutes));
      const clampedDuration = Math.max(1, endMinutes - startMinutes);
      const label = slotDate.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const id =
        slot?.id != null
          ? String(slot.id)
          : `${key}-${label}-${durationMin}`;
      const list = map.get(key) || [];
      list.push({
        id,
        label,
        startMinutes,
        durationMin: clampedDuration,
        endMinutes,
      });
      map.set(key, list);
    });
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => a.startMinutes - b.startMinutes);
      map.set(key, list);
    }
    return map;
  }, [availSlots]);
  const availDayIds = useMemo(
    () => Array.from(availSlotsByDay.keys()).sort(),
    [availSlotsByDay]
  );
  const availCalendarDays = useMemo(
    () => buildAvailabilityCalendar(availCalendarMonth),
    [availCalendarMonth]
  );
  const selectedAvailSlots = useMemo(
    () =>
      selectedAvailDayId ? availSlotsByDay.get(selectedAvailDayId) || [] : [],
    [selectedAvailDayId, availSlotsByDay]
  );
  const availGridMeta = useMemo(() => {
    const earliest =
      selectedAvailSlots.length > 0
        ? Math.min(...selectedAvailSlots.map((s) => s.startMinutes))
        : AVAIL_DEFAULT_START_HOUR * 60;
    const latest =
      selectedAvailSlots.length > 0
        ? Math.max(...selectedAvailSlots.map((s) => s.endMinutes))
        : AVAIL_DEFAULT_END_HOUR * 60;
    const startHour = selectedAvailSlots.length
      ? Math.max(0, Math.floor(earliest / 60) - 1)
      : AVAIL_DEFAULT_START_HOUR;
    const endHour = selectedAvailSlots.length
      ? Math.min(24, Math.ceil(latest / 60) + 1)
      : AVAIL_DEFAULT_END_HOUR;
    const totalHours = Math.max(1, endHour - startHour);
    const rawHourHeight = Math.floor(AVAIL_MAX_GRID_HEIGHT / totalHours);
    const hourHeight = Math.min(
      AVAIL_MAX_HOUR_HEIGHT,
      Math.max(AVAIL_MIN_HOUR_HEIGHT, rawHourHeight)
    );
    return {
      startHour,
      endHour,
      totalHours,
      hourHeight,
      gridHeight: totalHours * hourHeight,
    };
  }, [selectedAvailSlots]);
  const selectedAvailLabel = useMemo(() => {
    const date = parseYmdDate(selectedAvailDayId || undefined);
    if (!date) return null;
    const label = date.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    return capitalize(label);
  }, [selectedAvailDayId]);

  useEffect(() => {
    if (availDayIds.length === 0) {
      setSelectedAvailDayId(null);
      return;
    }
    setSelectedAvailDayId((prev) => {
      if (prev && availSlotsByDay.has(prev)) return prev;
      return availDayIds[0];
    });
    if (selectedAvailDayId && availSlotsByDay.has(selectedAvailDayId)) return;
    const fallbackDate = parseYmdDate(availDayIds[0]);
    if (!fallbackDate) return;
    setAvailCalendarMonth((prev) => {
      const nextMonth = new Date(
        fallbackDate.getFullYear(),
        fallbackDate.getMonth(),
        1
      );
      if (
        prev.getFullYear() === nextMonth.getFullYear() &&
        prev.getMonth() === nextMonth.getMonth()
      )
        return prev;
      return nextMonth;
    });
  }, [availDayIds, availSlotsByDay, selectedAvailDayId]);

  const fetchAvailabilitySlots = useCallback(async () => {
    if (!user?.email) return;
    setAvailSlotsLoading(true);
    setAvailDeleteMsg(null);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Token non disponibile");
      const res = await fetch("/api/admin/availability", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setAvailSlots(Array.isArray(data?.slots) ? data.slots : []);
    } catch (err: any) {
      setAvailDeleteMsg(err?.message || "Errore caricamento disponibilità");
    } finally {
      setAvailSlotsLoading(false);
    }
  }, [user?.email]);
  const [completeBookingId, setCompleteBookingId] = useState<string | null>(
    null
  );
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [renamingStudentId, setRenamingStudentId] = useState<string | null>(
    null
  );
  const isTutor = tutorMode === "tutor" && Boolean(tutorData);

  useEffect(() => {
    if (isTutor) {
      fetchAvailabilitySlots();
    }
  }, [isTutor, fetchAvailabilitySlots]);

  const loadTutorBookings = useCallback(async () => {
    if (!user?.email) {
      setTutorMode("none");
      setTutorData(null);
      setTutorError(null);
      return;
    }
    setTutorLoading(true);
    setTutorError(null);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Token non disponibile");
      const res = await fetch("/api/admin/bookings?meta=1", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.bookings)) {
        const normalizeHours = (v: any) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };
        const students = Array.isArray(data?.tutorSummary?.students)
          ? data.tutorSummary.students
              .map((s: any, idx: number) => {
                const hoursPaid = normalizeHours(
                  s?.hoursPaid ?? s?.hours_paid ?? s?.remainingPaid ?? 0
                );
                const hoursConsumed = normalizeHours(
                  s?.hoursConsumed ?? s?.hours_consumed ?? 0
                );
                const consumedBaseline = normalizeHours(
                  s?.consumedBaseline ?? s?.consumed_baseline ?? 0
                );
                const chargeableHours = Math.max(
                  0,
                  hoursConsumed - consumedBaseline
                );
                const hourlyRate =
                  typeof s?.hourlyRate === "number"
                    ? s.hourlyRate
                    : normalizeHours(s?.hourlyRate);
                return {
                  id: s?.id ? String(s.id) : `student-${idx}`,
                  name:
                    s?.name ||
                    s?.fullName ||
                    s?.displayName ||
                    s?.student_name ||
                    s?.student_email ||
                    s?.parent_email ||
                    "Studente",
                  email:
                    s?.email || s?.student_email || s?.parent_email || null,
                  phone:
                    s?.phone || s?.student_phone || s?.parent_phone || null,
                  whatsappGroupLink:
                    s?.whatsappGroupLink ||
                    s?.whatsapp_group_link ||
                    null,
                  hoursPaid,
                  hoursConsumed,
                  consumedBaseline,
                  chargeableHours,
                  remainingPaid: Math.max(
                    0,
                    normalizeHours(s?.remainingPaid ?? hoursPaid)
                  ),
                  hourlyRate: Number.isFinite(Number(hourlyRate))
                    ? Number(hourlyRate)
                    : null,
                  isBlack: Boolean(
                    s?.isBlack ||
                      s?.status === "active" ||
                      hoursPaid > 0 ||
                      hoursConsumed > 0
                  ),
                } as TutorStudent;
              })
              .filter(Boolean)
          : [];
        const hoursDue = data?.tutorSummary
          ? normalizeHours(data.tutorSummary.hoursDue)
          : null;
        const tutorName =
          (Array.isArray(data?.tutors) && data.tutors[0]?.display_name) ||
          (Array.isArray(data?.tutors) && data.tutors[0]?.email) ||
          user.email;
        setTutorData({
          bookings: data.bookings,
          callTypes: data.callTypes || [],
          tutorName,
          hoursDue,
          students,
        });
        setTutorMode("tutor");
      } else {
        setTutorMode("none");
        setTutorData(null);
        if (res.status !== 403 && res.status !== 401 && data?.error) {
          setTutorError(data.error);
        }
      }
    } catch (err: any) {
      setTutorMode("none");
      if (user?.email) {
        setTutorError(err?.message || "Errore caricamento calendario tutor");
      }
    } finally {
      setTutorLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadTutorBookings();
  }, [loadTutorBookings]);

  // UI state: none (pagina unica, sezioni verticali)
  const [gradesVersion, setGradesVersion] = useState(0);

  const nextBookingLabel = useMemo(() => {
    const source =
      nextBooking?.hasBooking && nextBooking.startsAt
        ? nextBooking.startsAt
        : weeklyCheck?.hasBooking && weeklyCheck.startsAt
          ? weeklyCheck.startsAt
          : null;
    if (source) {
      return formatDateTimeLabel(source);
    }
    return null;
  }, [nextBooking, weeklyCheck]);

  const nextLessonReminder = useMemo(() => {
    if (nextBooking?.hasBooking && nextBooking.startsAt) {
      return {
        label: formatDateTimeLabel(nextBooking.startsAt),
        type: nextBooking.callTypeName || null,
      };
    }
    return null;
  }, [nextBooking]);

  const handleSaveUsername = async () => {
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setUsernameSaved("err");
      return;
    }
    setUsernameLoading(true);
    setUsernameSaved("idle");

    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      if (!idToken) throw new Error("no_token");

      const res = await fetch("/api/account/username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ username: clean }),
      });

      if (res.status === 409) {
        setUsernameSaved("err");
        return;
      }
      if (!res.ok) throw new Error("server");

      const data = await res.json();
      setUsername(data.username);
      setUsernameSaved("ok");
      await refreshSavedLessons();
    } catch {
      setUsernameSaved("err");
    } finally {
      setUsernameLoading(false);
      setTimeout(() => setUsernameSaved("idle"), 2500);
    }
  };

  const handleUpgrade = async () => {
    if (isSubscribed) {
      // Se è già abbonato, apri il Customer Portal di Stripe
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch("/api/create-portal-session", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch (error) {
        console.error("Errore apertura portal:", error);
      }
    } else {
      // Se non è abbonato, vai alla pagina Black
      window.location.href = "/black";
    }
  };

  // Profile for tracks/year badge
  type ProfilePrefs = {
    cycle?: "medie" | "liceo" | "altro";
    year?: number;
    indirizzo?: string;
    goalMin?: number;
    showBadges?: boolean;
  };
  const [profile, setProfile] = useState<ProfilePrefs | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/me/profile", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json();
        if (json?.profile) setProfile(json.profile);
      } catch {}
    })();
  }, [user?.uid]);

  const tutorStudents = useMemo(
    () =>
      isTutor && Array.isArray(tutorData?.students) ? tutorData.students : [],
    [isTutor, tutorData?.students]
  );
  const tutorTotalRemainingPaid = useMemo(
    () =>
      tutorStudents.reduce(
        (acc, s) =>
          acc +
          (Number.isFinite(Number(s?.remainingPaid))
            ? Number(s.remainingPaid)
            : 0),
        0
      ),
    [tutorStudents]
  );
  const tutorHoursDue = useMemo(() => {
    if (!isTutor) return null;
    const n = Number(tutorData?.hoursDue);
    return Number.isFinite(n) ? n : null;
  }, [isTutor, tutorData?.hoursDue]);
  const tutorAmountDue = useMemo(
    () =>
      tutorStudents.reduce((acc, s) => {
        const rate = Number(s?.hourlyRate ?? 0);
        const billable = Number.isFinite(Number(s?.chargeableHours))
          ? Number(s.chargeableHours)
          : Math.max(
              0,
              Number(s?.hoursConsumed ?? 0) - Number(s?.consumedBaseline ?? 0)
            );
        if (!Number.isFinite(rate) || !Number.isFinite(billable)) return acc;
        return acc + rate * billable;
      }, 0),
  [tutorStudents]
  );
  const tutorAmountDueDisplay = useMemo(() => {
    if (!isTutor) return null;
    if (tutorHoursDue === 0) return 0;
    return tutorAmountDue;
  }, [isTutor, tutorHoursDue, tutorAmountDue]);
  const tutorGrouped = useMemo(() => {
    if (!isTutor || !tutorData) return [];
    const sorted = [...(tutorData.bookings || [])].sort((a, b) => {
      const aTs = new Date(a?.startsAt || "").getTime();
      const bTs = new Date(b?.startsAt || "").getTime();
      return (Number.isNaN(aTs) ? 0 : aTs) - (Number.isNaN(bTs) ? 0 : bTs);
    });
    const base = sorted;
    const grouped: { key: string; label: string; items: any[] }[] = [];
    base.forEach((bk: any) => {
      const { key, label } = formatTutorDayLabel(bk?.startsAt);
      const existing = grouped.find((g) => g.key === key);
      if (existing) existing.items.push(bk);
      else grouped.push({ key, label, items: [bk] });
    });
    grouped.sort((a, b) => {
      const aTs = new Date(a.key).getTime();
      const bTs = new Date(b.key).getTime();
      return (Number.isNaN(aTs) ? 0 : aTs) - (Number.isNaN(bTs) ? 0 : bTs);
    });
    return grouped;
  }, [isTutor, tutorData]);

  const tutorCallDuration = useCallback(
    (bk: any) => {
      if (Number(bk?.durationMin) > 0) return Number(bk.durationMin);
      const match =
        tutorData?.callTypes?.find?.(
          (ct: any) =>
            ct?.id === bk?.callTypeId ||
            ct?.slug === bk?.callType ||
            ct?.id === bk?.call_type_id
        ) || null;
      if (match && Number(match.duration_min) > 0)
        return Number(match.duration_min);
      return 60;
    },
    [tutorData?.callTypes]
  );
  const unpaidBookingIds = useMemo(() => {
    const bookings = Array.isArray(tutorData?.bookings)
      ? tutorData.bookings
      : [];
    if (!bookings.length || !tutorStudents.length) return new Set<string>();
    const studentIdByEmail = new Map<string, string>();
    const remainingByStudent = new Map<string, number>();
    tutorStudents.forEach((s) => {
      if (s.email) studentIdByEmail.set(s.email.toLowerCase(), s.id);
      remainingByStudent.set(s.id, getStudentRemainingMinutes(s));
    });
    const now = Date.now();
    const grouped = new Map<string, any[]>();
    bookings.forEach((bk) => {
      const status = String(bk?.status || "confirmed").toLowerCase();
      if (status === "completed" || status === "cancelled") return;
      const startMs = getBookingStartMs(bk);
      if (startMs == null || startMs < now) return;
      const studentId =
        bk?.studentId ||
        (bk?.email ? studentIdByEmail.get(String(bk.email).toLowerCase()) : null);
      if (!studentId) return;
      const list = grouped.get(studentId) || [];
      list.push(bk);
      grouped.set(studentId, list);
    });
    const unpaid = new Set<string>();
    grouped.forEach((list, studentId) => {
      const sorted = [...list].sort((a, b) => {
        const aMs = getBookingStartMs(a) ?? 0;
        const bMs = getBookingStartMs(b) ?? 0;
        return aMs - bMs;
      });
      let remaining = remainingByStudent.get(studentId) ?? 0;
      sorted.forEach((bk) => {
        const durationRaw = Number(tutorCallDuration(bk));
        const durationMin =
          Number.isFinite(durationRaw) && durationRaw > 0
            ? durationRaw
            : DEFAULT_DURATION_MIN;
        if (remaining >= durationMin) {
          remaining -= durationMin;
        } else {
          unpaid.add(getBookingKey(bk));
          remaining = 0;
        }
      });
    });
    return unpaid;
  }, [tutorData?.bookings, tutorStudents, tutorCallDuration]);

  const tutorDayList = useMemo(
    () =>
      tutorGrouped.map((g) => {
        const first = g.items[0];
        const time = first?.startsAt
          ? formatTutorTimeRange(first.startsAt, tutorCallDuration(first))
          : "";
        return {
          key: g.key,
          label: g.label,
          meta: time,
          count: g.items.length,
        };
      }),
    [tutorGrouped, tutorCallDuration]
  );

  const tutorDayCountMap = useMemo(() => {
    const m = new Map<string, number>();
    tutorDayList.forEach((d) => m.set(d.key, d.count));
    return m;
  }, [tutorDayList]);

  const tutorDaySet = useMemo(
    () => new Set(tutorDayList.map((d) => d.key)),
    [tutorDayList]
  );

  const [selectedTutorDay, setSelectedTutorDay] = useState<string | null>(null);
  const [tutorCalendarMonth, setTutorCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const todayYmd = useMemo(() => ymd(new Date()), []);
  const selectedScheduleStudent = useMemo(
    () =>
      tutorStudents.find((s) => s.id === scheduleStudentId) ||
      tutorStudents[0] ||
      null,
    [scheduleStudentId, tutorStudents]
  );
  const scheduleWillBeUnpaid = useMemo(() => {
    if (scheduleMode !== "create") return false;
    if (schedulePast) return false;
    if (!selectedScheduleStudent) return false;
    if (!scheduleDate || !scheduleTime) return false;
    const draftDate = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (Number.isNaN(draftDate.getTime())) return false;
    const draftMs = draftDate.getTime();
    if (draftMs < Date.now()) return false;
    const studentId = selectedScheduleStudent.id;
    const bookings = Array.isArray(tutorData?.bookings)
      ? tutorData.bookings
      : [];
    const futureBookings = bookings.filter((bk) => {
      const status = String(bk?.status || "confirmed").toLowerCase();
      if (status === "completed" || status === "cancelled") return false;
      const startMs = getBookingStartMs(bk);
      if (startMs == null || startMs < Date.now()) return false;
      if (bk?.studentId === studentId) return true;
      const studentEmail = selectedScheduleStudent.email
        ? selectedScheduleStudent.email.toLowerCase()
        : null;
      if (!studentEmail) return false;
      return String(bk?.email || "").toLowerCase() === studentEmail;
    });
    const draftBooking = {
      __draft: true,
      startsAt: draftDate.toISOString(),
      durationMin: DEFAULT_DURATION_MIN,
    };
    const sorted = [...futureBookings, draftBooking].sort((a: any, b: any) => {
      const aMs = getBookingStartMs(a) ?? 0;
      const bMs = getBookingStartMs(b) ?? 0;
      return aMs - bMs;
    });
    let remaining = getStudentRemainingMinutes(selectedScheduleStudent);
    for (const bk of sorted) {
      const durationRaw = bk.__draft
        ? DEFAULT_DURATION_MIN
        : Number(tutorCallDuration(bk));
      const durationMin =
        Number.isFinite(durationRaw) && durationRaw > 0
          ? durationRaw
          : DEFAULT_DURATION_MIN;
      if (remaining >= durationMin) {
        remaining -= durationMin;
        continue;
      }
      if (bk.__draft) return true;
      remaining = 0;
    }
    return false;
  }, [
    scheduleMode,
    schedulePast,
    scheduleDate,
    scheduleTime,
    selectedScheduleStudent,
    tutorData?.bookings,
    tutorCallDuration,
  ]);
  const toggleAvailDay = useCallback((d: number) => {
    setAvailDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }, []);

  const openScheduleModal = useCallback(
    (opts?: { studentId?: string; date?: string }) => {
      const nextStudentId = opts?.studentId || tutorStudents[0]?.id || "";
      setScheduleMode("create");
      setEditingBooking(null);
      setScheduleStudentId(nextStudentId);
      setScheduleDate(opts?.date || todayYmd);
      setScheduleTime("15:00");
      setScheduleError(null);
      setScheduleModalOpen(true);
      setScheduleCallType((prev) => prev || DEFAULT_CALL_TYPE);
      setSchedulePast(false);
    },
    [todayYmd, tutorStudents]
  );

  const openEditBooking = useCallback(
    (booking: any) => {
      if (!booking) return;
      const startDate = booking.startsAt ? new Date(booking.startsAt) : null;
      const fallbackDate =
        startDate && !Number.isNaN(startDate.getTime())
          ? ymd(startDate)
          : todayYmd;
      setScheduleMode("edit");
      setEditingBooking(booking);
      setScheduleStudentId(booking.studentId || "");
      setScheduleDate(fallbackDate);
      setScheduleTime(toInputTime(booking.startsAt) || "15:00");
      setScheduleError(null);
      setScheduleModalOpen(true);
      setSchedulePast(false);
    },
    [todayYmd]
  );

  const handleScheduleSubmit = useCallback(async () => {
    const parsedDate = new Date(
      `${scheduleDate}T${scheduleTime || "00:00"}:00`
    );
    if (Number.isNaN(parsedDate.getTime())) {
      setScheduleError("Inserisci data e ora valide");
      return;
    }
    const iso = parsedDate.toISOString();
    setScheduleSaving(true);
    setScheduleError(null);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Token non disponibile");

      if (scheduleMode === "edit" && editingBooking?.id) {
        const res = await fetch("/api/admin/bookings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: editingBooking.id,
            startsAt: iso,
            durationMin: editingBooking.durationMin,
            callTypeSlug: editingBooking.callType || undefined,
            status: schedulePast ? "completed" : undefined,
            studentId: scheduleStudentId || editingBooking.studentId || undefined,
            allowUnpaid: true,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setScheduleModalOpen(false);
        setEditingBooking(null);
        setScheduleMode("create");
        await loadTutorBookings();
        return;
      }

      const student =
        tutorStudents.find((s) => s.id === scheduleStudentId) ||
        tutorStudents[0];
      if (!student) {
        setScheduleError("Seleziona uno studente");
        return;
      }
      const callTypeSlug = DEFAULT_CALL_TYPE;
      const note = student.phone ? `Telefono: ${student.phone}` : undefined;
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startsAt: iso,
          callTypeSlug,
          durationMin: DEFAULT_DURATION_MIN,
          fullName: student.name || "Studente",
          email: student.email || "noreply@theoremz.com",
          note,
          studentId: student.id,
          status: schedulePast ? "completed" : "confirmed",
          allowUnpaid: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setScheduleModalOpen(false);
      await loadTutorBookings();
    } catch (err: any) {
      setScheduleError(err?.message || "Errore prenotazione");
    } finally {
      setScheduleSaving(false);
    }
  }, [
    tutorStudents,
    scheduleStudentId,
    scheduleDate,
    scheduleTime,
    loadTutorBookings,
    scheduleMode,
    editingBooking,
    schedulePast,
  ]);

  const handleGenerateAvailability = useCallback(async () => {
    setAvailSaving(true);
    setAvailMsg(null);
    setAvailDeleteMsg(null);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Token non disponibile");
      const daysOfWeek = new Set(availDays.values());
      const startDate = parseYmdDate(availFrom);
      const endDate = parseYmdDate(availTo);
      if (!startDate || !endDate) {
        throw new Error("Intervallo date non valido");
      }
      if (endDate.getTime() < startDate.getTime()) {
        throw new Error("Data fine precedente alla data inizio");
      }
      const [startH, startM] = availStart.split(":").map((v) => Number(v));
      const [endH, endM] = availEnd.split(":").map((v) => Number(v));
      if (
        !Number.isFinite(startH) ||
        !Number.isFinite(startM) ||
        !Number.isFinite(endH) ||
        !Number.isFinite(endM)
      ) {
        throw new Error("Finestra oraria non valida");
      }
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      if (endTotal <= startTotal) {
        throw new Error("Finestra oraria non valida");
      }
      const blocks: Array<{ startMs: number; endMs: number }> = [];
      const cursor = new Date(startDate);
      cursor.setHours(0, 0, 0, 0);
      while (cursor.getTime() <= endDate.getTime()) {
        const dow = (cursor.getDay() + 6) % 7;
        if (daysOfWeek.has(dow)) {
          const start = new Date(
            cursor.getFullYear(),
            cursor.getMonth(),
            cursor.getDate(),
            startH,
            startM,
            0,
            0
          );
          const end = new Date(
            cursor.getFullYear(),
            cursor.getMonth(),
            cursor.getDate(),
            endH,
            endM,
            0,
            0
          );
          if (end.getTime() > start.getTime()) {
            blocks.push({
              startMs: start.getTime(),
              endMs: end.getTime(),
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
      }
      if (!blocks.length) {
        throw new Error("Nessuna disponibilità generata");
      }
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blocks }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setAvailMsg(`Disponibilità inserite: ${data?.slots || "ok"}`);
      await Promise.all([loadTutorBookings(), fetchAvailabilitySlots()]);
    } catch (err: any) {
      setAvailMsg(err?.message || "Errore disponibilità");
    } finally {
      setAvailSaving(false);
    }
  }, [
    availFrom,
    availTo,
    availStart,
    availEnd,
    availDays,
    loadTutorBookings,
    fetchAvailabilitySlots,
  ]);

  const handleCompleteBooking = useCallback(
    async (booking?: any) => {
      const bookingId = booking?.id || booking;
      if (!bookingId) return;
      setCompleteBookingId(bookingId);
      setCompleteError(null);
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Token non disponibile");
        const res = await fetch("/api/admin/bookings/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: bookingId,
            studentId: booking?.studentId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        await loadTutorBookings();
      } catch (err: any) {
        setCompleteError(err?.message || "Errore salvataggio");
      } finally {
        setCompleteBookingId(null);
      }
    },
    [loadTutorBookings]
  );

  const handleRenameStudent = useCallback(
    async (student: TutorStudent) => {
      const currentName = student.name || "";
      const nextName = window.prompt("Nuovo nome studente", currentName)?.trim();
      if (!nextName || nextName === currentName) return;
      setRenamingStudentId(student.id);
      setTutorError(null);
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Token non disponibile");
        const res = await fetch("/api/tutor/black-student", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ studentId: student.id, name: nextName }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setTutorData((prev) => {
          if (!prev?.students) return prev;
          return {
            ...prev,
            students: prev.students.map((s) =>
              s.id === student.id ? { ...s, name: nextName } : s
            ),
          };
        });
      } catch (err: any) {
        setTutorError(err?.message || "Errore aggiornamento nome");
      } finally {
        setRenamingStudentId(null);
      }
    },
    []
  );

  const handleCancelBooking = useCallback(
    async (booking?: any) => {
      const bookingId = booking?.id || booking;
      if (!bookingId) return;
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          "Vuoi cancellare questa lezione? Verrà liberato lo slot."
        );
        if (!confirmed) return;
      }
      setCancelBookingId(bookingId);
      setCancelError(null);
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Token non disponibile");
        const res = await fetch("/api/admin/bookings", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: bookingId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        await loadTutorBookings();
      } catch (err: any) {
        setCancelError(err?.message || "Errore cancellazione");
      } finally {
        setCancelBookingId(null);
      }
    },
    [loadTutorBookings]
  );

  useEffect(() => {
    if (!tutorDayList.length) {
      setSelectedTutorDay(null);
      return;
    }
    const upcoming =
      tutorDayList.find((d) => d.key >= todayYmd) || tutorDayList[0] || null;
    if (
      !selectedTutorDay ||
      !tutorDayList.find((d) => d.key === selectedTutorDay)
    ) {
      setSelectedTutorDay(upcoming?.key || tutorDayList[0].key);
    }
  }, [tutorDayList, selectedTutorDay, todayYmd]);

  useEffect(() => {
    if (!selectedTutorDay) return;
    const d = new Date(`${selectedTutorDay}T00:00:00`);
    if (Number.isNaN(d.getTime())) return;
    setTutorCalendarMonth((prev) => {
      if (prev.year === d.getFullYear() && prev.month === d.getMonth())
        return prev;
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, [selectedTutorDay]);

  const selectedTutorGroup = useMemo(
    () => tutorGrouped.find((g) => g.key === selectedTutorDay) || null,
    [tutorGrouped, selectedTutorDay]
  );

  const handleTutorMonthChange = (delta: number) => {
    setTutorCalendarMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const tutorCalendarRows = useMemo(
    () => monthMatrix(tutorCalendarMonth.year, tutorCalendarMonth.month),
    [tutorCalendarMonth]
  );
  const tutorMonthLabel = useMemo(
    () =>
      new Date(
        tutorCalendarMonth.year,
        tutorCalendarMonth.month,
        1
      ).toLocaleString("it-IT", {
        month: "long",
        year: "numeric",
      }),
    [tutorCalendarMonth]
  );

  // Skeleton
  if (!user) {
    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
        <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-56 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-56 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  const avatarLetter = (
    friendlyName?.[0] ||
    user.email?.[0] ||
    "U"
  ).toUpperCase();

  const isCheckingWeeklyCall =
    weeklyCheckLoading || (!weeklyCheck && !weeklyCheckError);

  // Badges component per riutilizzo
  const BadgesRow = () => (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isTutor ? (
        <span className="inline-flex items-center gap-1.5 text-xs bg-gradient-to-r from-slate-900 via-indigo-900 to-black px-2.5 py-1 rounded-full border border-white/25 shadow-lg shadow-black/30">
          <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
          <span className="font-semibold text-white">Tutor</span>
        </span>
      ) : (
        <>
          {profile?.year && (
            <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
              🎓 {formatClass(profile)}
            </span>
          )}
          {isSubscribed ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs bg-gradient-to-r from-slate-800 to-black px-2.5 py-1 rounded-full border border-white/20 shadow-lg"
              title={
                subscriptionStartDate
                  ? `Abbonato dal ${subscriptionStartDate}`
                  : undefined
              }
            >
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              <span className="font-bold text-white">{planDisplayLabel}</span>
              {subscriptionDuration && (
                <span className="text-white/80 font-medium ml-0.5">
                  · {subscriptionDuration}
                </span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs bg-black/20 px-2.5 py-1 rounded-full">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V11a1 1 0 011-1h1zm2 0h8V8a4 4 0 00-8 0v2z" />
              </svg>
              Free
            </span>
          )}
        </>
      )}
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-cyan-600 via-blue-600 to-sky-600 text-white shadow-[0_10px_40px_rgba(37,99,235,0.35)]">
        <div className="absolute inset-0 opacity-25 mix-blend-overlay bg-[radial-gradient(circle_at_0%_0%,white,transparent_50%)]" />
        <div className="relative p-5 sm:p-8">
          {/* Badges in alto a sinistra - visibili solo su mobile */}
          <div className="sm:hidden mb-2 -mt-2 -ml-1">
            <BadgesRow />
          </div>

          <div className="flex items-center gap-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white/20 flex items-center justify-center text-xl sm:text-2xl font-bold">
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold truncate">
                  Ciao, {friendlyName}!
                </h1>
                {/* Badges visibili solo su desktop */}
                <div className="hidden sm:flex items-center gap-3 flex-wrap">
                  <BadgesRow />
                </div>
              </div>
              <p className="text-white/90 text-xs sm:text-sm mt-1 truncate">
                {user.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {nextBookingLabel && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white">
                    <CalendarClock className="h-4 w-4" aria-hidden />
                    Prossima call: {nextBookingLabel}
                  </span>
                )}
                {!isTutor && (
                  <>
                    {!isSubscribed && (
                      <Link
                        href="/black#pricing"
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 via-rose-500 to-red-600 px-3 py-1.5 text-sm font-bold text-white shadow-[0_10px_32px_-18px_rgba(239,68,68,0.9)] hover:brightness-110 hover:shadow-[0_12px_36px_-16px_rgba(239,68,68,1)] transition"
                      >
                        <Sparkles className="h-4 w-4" />
                        Scopri l&apos;offerta di Natale Black
                      </Link>
                    )}
                    {!isSubscribed && (
                      <button
                        onClick={handleUpgrade}
                        className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm"
                      >
                        Passa a Black
                      </button>
                    )}
                    <button
                      onClick={() => router.push("/simula-verifica")}
                      className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm"
                    >
                      Simula verifica
                    </button>
                    <button
                      onClick={() => router.push("/risolutore")}
                      className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm"
                    >
                      Risolutore AI
                    </button>
                  </>
                )}
                {isTutor && (
                  <a
                    href="https://wa.me/3519523641?text=Ciao%20team%20Theoremz,%20sono%20un%20tutor%20ho%20bisogno%20di%20supporto."
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-sm font-semibold text-white shadow-sm"
                  >
                    Contatta il team
                  </a>
                )}
                <button
                  onClick={async () => {
                    try {
                      await doLogout();
                      router.push("/");
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="rounded-lg bg-black/20 hover:bg-black/30 px-3 py-1.5 text-sm"
                >
                  Esci
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isTutor ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900 shadow-sm px-4 py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300">
                  Calendario tutor
                </p>
                <p className="text-sm font-bold text-slate-900 [.dark_&]:text-white">
                  {tutorData?.tutorName || "Tutor"} · {user.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {tutorLoading ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 [.dark_&]:bg-slate-800 [.dark_&]:text-slate-200">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Aggiornamento…
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={loadTutorBookings}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 [.dark_&]:border-slate-700 [.dark_&]:text-slate-100 hover:bg-slate-50 [.dark_&]:hover:bg-slate-800/60"
                  disabled={tutorLoading}
                >
                  Aggiorna
                </button>
              </div>
            </div>
            {tutorError ? (
              <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700 [.dark_&]:bg-rose-500/10 [.dark_&]:text-rose-100">
                {tutorError}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900 shadow-sm p-4 space-y-2">
              <p className="text-sm font-bold text-slate-900 [.dark_&]:text-white">
                Saldo
              </p>
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-700 to-sky-500 leading-tight drop-shadow-[0_12px_30px_rgba(40,88,200,0.32)]">
                {tutorLoading ? (
                  <span className="inline-block h-8 w-28 animate-pulse rounded bg-slate-200 [.dark_&]:bg-slate-800" />
                ) : (
                  formatEuro(tutorAmountDueDisplay ?? tutorAmountDue)
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500 [.dark_&]:text-slate-400">
                Stima basata su ore erogate e tariffa per studente. Aggiorna le
                ore per vedere il saldo corrente.
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-600 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800/60 [.dark_&]:text-slate-200">
                Ore da pagare:{" "}
                {tutorLoading ? (
                  <span className="inline-block h-6 w-20 animate-pulse rounded bg-slate-200 [.dark_&]:bg-slate-800" />
                ) : (
                  formatHoursLabel(tutorHoursDue)
                )}
              </div>
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-600 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800/60 [.dark_&]:text-slate-200">
                Ore prepagate dagli studenti assegnati:{" "}
                {formatHoursLabel(tutorTotalRemainingPaid)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900 shadow-sm p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900 [.dark_&]:text-white">
                    Studenti assegnati
                  </p>
                  <p className="text-xs font-semibold text-slate-500 [.dark_&]:text-slate-400">
                    Elenco studenti collegati al tuo profilo tutor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadTutorBookings}
                  className="text-[11px] rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 [.dark_&]:border-slate-700 [.dark_&]:text-slate-100 [.dark_&]:hover:bg-slate-800/60"
                  disabled={tutorLoading}
                >
                  Refresh
                </button>
              </div>
              <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {tutorLoading && !tutorStudents.length ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-16 rounded-xl border border-slate-200 bg-slate-50 animate-pulse [.dark_&]:border-slate-800 [.dark_&]:bg-slate-800/60"
                      />
                    ))}
                  </div>
                ) : null}
                {!tutorLoading && !tutorStudents.length ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 [.dark_&]:border-slate-700 [.dark_&]:text-slate-300">
                    Nessuno studente assegnato al momento.
                  </div>
                ) : null}
                {tutorStudents.map((s) => {
                  const whatsappLink = normalizeWhatsAppGroupLink(s.whatsappGroupLink);
                  return (
                    <div
                      key={s.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/60"
                    >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-slate-900 [.dark_&]:text-white">
                          {s.name}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 [.dark_&]:text-slate-400">
                          {(s.email || "Email n/d") +
                            (s.phone ? ` • ${s.phone}` : "")}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Number(s.remainingPaid) > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 [.dark_&]:bg-emerald-500/15 [.dark_&]:text-emerald-200">
                            {formatHoursLabel(s.remainingPaid)} rimaste
                          </span>
                        ) : null}
                        {s.isBlack ? (
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-800 [.dark_&]:bg-indigo-500/15 [.dark_&]:text-indigo-200">
                            Black
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500 [.dark_&]:text-slate-400">
                      Ore erogate: {formatHoursLabel(s.hoursConsumed)} ·
                      Disponibili: {formatHoursLabel(s.remainingPaid)}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 [.dark_&]:text-slate-400">
                      Tariffa:{" "}
                      {s.hourlyRate != null ? `${s.hourlyRate} €/h` : "n/d"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openScheduleModal({ studentId: s.id })}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 [.dark_&]:border-slate-700 [.dark_&]:text-slate-100 [.dark_&]:hover:bg-slate-800/60"
                      >
                        Programma
                      </button>
                      {whatsappLink ? (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 [.dark_&]:border-emerald-500/40 [.dark_&]:text-emerald-200 [.dark_&]:hover:bg-emerald-500/10"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      {s.isBlack ? (
                        <button
                          type="button"
                          onClick={() => handleRenameStudent(s)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 [.dark_&]:border-slate-700 [.dark_&]:text-slate-100 [.dark_&]:hover:bg-slate-800/60 disabled:opacity-60"
                          disabled={renamingStudentId === s.id}
                        >
                          {renamingStudentId === s.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Pencil className="h-3 w-3" />
                          )}
                          Rinomina
                        </button>
                      ) : null}
                      {s.isBlack ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/tutor/scheda-black?studentId=${s.id}`)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-50 [.dark_&]:border-indigo-500 [.dark_&]:text-indigo-200 [.dark_&]:hover:bg-indigo-500/10"
                        >
                          Scheda Black
                        </button>
                      ) : null}
                    </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900 [.dark_&]:text-white">
                    Calendario
                  </p>
                  <p className="text-xs font-semibold text-slate-500 [.dark_&]:text-slate-400">
                    Clicca un giorno per vedere i blocchi.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openScheduleModal({ date: selectedTutorDay || todayYmd })
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 [.dark_&]:border-slate-700 [.dark_&]:text-slate-100 [.dark_&]:hover:bg-slate-800/60"
                  >
                    Programma
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTutorMonthChange(-1)}
                      className="h-8 w-8 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 [.dark_&]:border-slate-700 [.dark_&]:text-slate-100 [.dark_&]:hover:bg-slate-800/60"
                      aria-label="Mese precedente"
                    >
                      ‹
                    </button>
                    <div className="px-2 text-xs font-bold uppercase text-slate-600 [.dark_&]:text-slate-300">
                      {tutorMonthLabel}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTutorMonthChange(1)}
                      className="h-8 w-8 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 [.dark_&]:border-slate-700 [.dark_&]:text-slate-100 [.dark_&]:hover:bg-slate-800/60"
                      aria-label="Mese successivo"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-px rounded-lg bg-slate-100 [.dark_&]:bg-slate-800">
                {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(
                  (day) => (
                    <div
                      key={day}
                      className="bg-white [.dark_&]:bg-slate-900 py-2 text-center text-[11px] font-semibold text-slate-500 [.dark_&]:text-slate-300"
                    >
                      {day}
                    </div>
                  )
                )}
                {tutorCalendarRows.map((row, ridx) =>
                  row.map((cell, cidx) => {
                    if (!cell) {
                      return (
                        <div
                          key={`${ridx}-${cidx}-empty`}
                          className="bg-slate-50 [.dark_&]:bg-slate-900 h-14"
                        />
                      );
                    }
                    const ds = ymd(cell);
                    const hasBookings = tutorDaySet.has(ds);
                    const isSelected = selectedTutorDay === ds;
                    const isToday = ds === todayYmd;
                    const count = tutorDayCountMap.get(ds) || 0;
                    const base =
                      "h-14 flex flex-col items-center justify-center gap-1 border text-xs font-semibold transition";
                    const classes = isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-900 [.dark_&]:border-sky-500 [.dark_&]:bg-sky-500/15 [.dark_&]:text-sky-100"
                      : hasBookings
                        ? "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:hover:border-sky-500/50 [.dark_&]:hover:bg-sky-500/10"
                        : "border-slate-100 bg-slate-50 text-slate-400 [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/40 [.dark_&]:text-slate-600";
                    return (
                      <button
                        key={ds}
                        type="button"
                        onClick={() => hasBookings && setSelectedTutorDay(ds)}
                        className={`${base} ${classes}`}
                        disabled={!hasBookings}
                      >
                        <span className="text-sm font-black">
                          {cell.getDate()}
                          {isToday ? (
                            <span className="ml-1 text-[10px] font-bold text-blue-600 [.dark_&]:text-sky-300">
                              oggi
                            </span>
                          ) : null}
                        </span>
                        {hasBookings ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-slate-200">
                            {count} blocchi
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 [.dark_&]:text-slate-600">
                            —
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900 shadow-sm">
              <div className="border-b border-slate-200 [.dark_&]:border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 [.dark_&]:text-white">
                    {selectedTutorGroup?.label || "Seleziona un giorno"}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 [.dark_&]:text-slate-400">
                    {selectedTutorGroup
                      ? `${selectedTutorGroup.items.length} appuntamenti`
                      : "Nessuna selezione"}
                  </p>
                </div>
                {selectedTutorGroup ? (
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 [.dark_&]:bg-slate-800 [.dark_&]:text-slate-200">
                    {new Date(selectedTutorGroup.key).toLocaleDateString(
                      "it-IT",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </div>
                ) : null}
              </div>
              <div className="p-4 space-y-3">
                {!selectedTutorGroup && !tutorLoading ? (
                  <div className="text-sm font-semibold text-slate-600 [.dark_&]:text-slate-300">
                    Seleziona un giorno per vedere le call prenotate.
                  </div>
                ) : null}
                {selectedTutorGroup?.items.map((bk: any) => {
                  const bookingKey = getBookingKey(bk);
                  const isUnpaid = unpaidBookingIds.has(bookingKey);
                  const duration = tutorCallDuration(bk);
                  const callLabel = bk?.callTypeName || bk?.callType || "Call";
                  const status = (bk?.status || "confirmed") as string;
                  const statusLabel =
                    status === "cancelled"
                      ? "Cancellata"
                      : status === "confirmed"
                        ? "Confermata"
                        : status === "completed"
                          ? "Effettuata"
                          : status;
                  const statusClass =
                    status === "cancelled"
                      ? "bg-rose-100 text-rose-700 [.dark_&]:bg-rose-500/15 [.dark_&]:text-rose-200"
                      : status === "completed"
                        ? "bg-blue-100 text-blue-700 [.dark_&]:bg-sky-500/15 [.dark_&]:text-sky-100"
                        : "bg-emerald-100 text-emerald-700 [.dark_&]:bg-emerald-500/15 [.dark_&]:text-emerald-200";
                  const canEdit =
                    status !== "completed" && status !== "cancelled";
                  const isCancelling = cancelBookingId === bk?.id;
                  const isCompleting = completeBookingId === bk?.id;
                  const note = stripUnpaidNote(bk?.note);
                  return (
                    <div
                      key={bookingKey}
                      className="rounded-xl border border-slate-200 [.dark_&]:border-slate-800 bg-slate-50 [.dark_&]:bg-slate-900/60 px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-black text-slate-900 [.dark_&]:text-white">
                            {formatTutorTimeRange(bk?.startsAt, duration)}
                          </div>
                          <div className="text-xs font-semibold text-slate-600 [.dark_&]:text-slate-300">
                            {callLabel} · {duration} min
                          </div>
                          <div className="text-xs font-semibold text-slate-700 [.dark_&]:text-slate-200">
                            {bk?.fullName || "Studente"}
                          </div>
                          {note ? (
                            <div className="text-[11px] font-medium text-slate-500 [.dark_&]:text-slate-300">
                              {note}
                            </div>
                          ) : null}
                          {isUnpaid ? (
                            <div className="text-[11px] font-semibold text-amber-700 [.dark_&]:text-amber-200">
                              Ore insufficienti: lezione non pagata.
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                          {isUnpaid ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 [.dark_&]:bg-amber-500/15 [.dark_&]:text-amber-100">
                              Non pagata
                            </span>
                          ) : null}
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleCompleteBooking(bk)}
                              disabled={isCompleting}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-slate-100 [.dark_&]:hover:bg-slate-800/60 disabled:opacity-60"
                            >
                              {isCompleting ? "Salvo..." : "Segna effettuata"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {canEdit ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditBooking(bk)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 [.dark_&]:border-slate-700 [.dark_&]:text-slate-100 [.dark_&]:hover:bg-slate-800/60"
                          >
                            Modifica orario
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(bk)}
                            disabled={isCancelling}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 [.dark_&]:border-rose-500/40 [.dark_&]:text-rose-200 [.dark_&]:hover:bg-rose-500/10 disabled:opacity-60"
                          >
                            {isCancelling ? "Cancello..." : "Cancella"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {cancelError ? (
                  <div className="text-[12px] font-semibold text-rose-600 [.dark_&]:text-rose-300">
                    {cancelError}
                  </div>
                ) : null}
                {completeError ? (
                  <div className="text-[12px] font-semibold text-rose-600 [.dark_&]:text-rose-300">
                    {completeError}
                  </div>
                ) : null}
                {tutorLoading ? (
                  <div className="text-sm font-semibold text-slate-600 [.dark_&]:text-slate-300">
                    Caricamento blocchi...
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900 [.dark_&]:text-white">
                  Disponibilità calendario
                </p>
                <p className="text-xs font-semibold text-slate-500 [.dark_&]:text-slate-400">
                  Vedi e gestisci le disponibilità pubblicate sul calendario.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {availMsg && (
                  <span className="text-[11px] font-semibold text-emerald-600 [.dark_&]:text-emerald-300">
                    {availMsg}
                  </span>
                )}
                {availDeleteMsg && (
                  <span className="text-[11px] font-semibold text-rose-600 [.dark_&]:text-rose-300">
                    {availDeleteMsg}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fetchAvailabilitySlots()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-white [.dark_&]:hover:bg-slate-800/70"
              >
                Aggiorna disponibilità
              </button>
              <button
                type="button"
                onClick={() => setShowAddAvail((v) => !v)}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:brightness-110"
              >
                {showAddAvail ? "Chiudi aggiunta" : "Aggiungi disponibilità"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setAvailDeleteMsg(null);
                  try {
                    const token = await getAuth().currentUser?.getIdToken();
                    if (!token) throw new Error("Token non disponibile");
                    const res = await fetch("/api/admin/availability", {
                      method: "DELETE",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ resetAll: true }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
                    setAvailDeleteMsg(`Rimosse ${data?.deleted ?? 0} disponibilità future`);
                    await fetchAvailabilitySlots();
                  } catch (err: any) {
                    setAvailDeleteMsg(err?.message || "Errore reset disponibilità");
                  }
                }}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:brightness-110"
              >
                Reset disponibilità future
              </button>
            </div>

            {showAddAvail ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="text-[11px] font-semibold text-slate-600 [.dark_&]:text-slate-300">
                    Dal
                    <input
                      type="date"
                      value={availFrom}
                      onChange={(e) => setAvailFrom(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-white"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-600 [.dark_&]:text-slate-300">
                    Al
                    <input
                      type="date"
                      value={availTo}
                      onChange={(e) => setAvailTo(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-white"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-600 [.dark_&]:text-slate-300">
                    Dalle
                    <input
                      type="time"
                      value={availStart}
                      onChange={(e) => setAvailStart(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-white"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-600 [.dark_&]:text-slate-300">
                    Alle
                    <input
                      type="time"
                      value={availEnd}
                      onChange={(e) => setAvailEnd(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-white"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(
                    (d, idx) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleAvailDay(idx)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                          availDays.has(idx)
                            ? "border-blue-500 bg-blue-50 text-blue-700 [.dark_&]:border-sky-500 [.dark_&]:bg-sky-500/15 [.dark_&]:text-sky-100"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-slate-200 [.dark_&]:hover:border-sky-500/50 [.dark_&]:hover:bg-sky-500/10"
                        }`}
                      >
                        {d}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setAvailDays(new Set([0, 1, 2, 3, 4]))}
                    className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 [.dark_&]:border-slate-700 [.dark_&]:text-slate-200 [.dark_&]:hover:bg-slate-800/60"
                  >
                    No weekend
                  </button>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateAvailability}
                    disabled={availSaving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow hover:brightness-110 disabled:opacity-60"
                  >
                    {availSaving ? "Generazione..." : "Aggiungi disponibilità"}
                  </button>
                </div>
              </>
            ) : null}

            <div className="mt-2 rounded-xl border border-slate-200 [.dark_&]:border-slate-800 bg-slate-50 [.dark_&]:bg-slate-900/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 [.dark_&]:text-slate-100">
                  Calendario disponibilità
                </p>
                <span className="text-[11px] text-slate-500 [.dark_&]:text-slate-300">
                  {availSlotsLoading ? "Carico..." : `${availSlots.length} blocchi`}
                </span>
              </div>
              <div className="mt-3 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 [.dark_&]:text-slate-300">
                        Date pubblicate
                      </p>
                      <p className="text-lg font-semibold text-slate-900 [.dark_&]:text-white">
                        {availCalendarMonth.toLocaleString("it-IT", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Mese precedente"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 [.dark_&]:border-slate-800 [.dark_&]:text-slate-200 [.dark_&]:hover:bg-slate-800/70"
                        onClick={() =>
                          setAvailCalendarMonth((prev) =>
                            new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                          )
                        }
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Mese successivo"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 [.dark_&]:border-slate-800 [.dark_&]:text-slate-200 [.dark_&]:hover:bg-slate-800/70"
                        onClick={() =>
                          setAvailCalendarMonth((prev) =>
                            new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                          )
                        }
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 text-center text-[12px] font-semibold text-slate-500 [.dark_&]:text-slate-300">
                    {WEEKDAYS_SHORT.map((day) => (
                      <div key={day} className="py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-sm">
                    {availCalendarDays.map((day) => {
                      const isSelected = selectedAvailDayId === day.id;
                      const hasSlots = availSlotsByDay.has(day.id);
                      const disabled = !hasSlots;
                      const label = isSelected ? "Selezionata" : undefined;
                      return (
                        <button
                          key={day.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            setSelectedAvailDayId(day.id);
                          }}
                          className={`relative flex h-12 flex-col items-center justify-center rounded-xl border text-[13px] font-semibold transition ${
                            disabled
                              ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/50 [.dark_&]:text-slate-600"
                              : isSelected
                                ? "border-slate-900 bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/70 [.dark_&]:border-slate-100/30 [.dark_&]:bg-slate-100/10 [.dark_&]:text-white [.dark_&]:ring-1 [.dark_&]:ring-slate-100/20"
                                : day.inCurrentMonth
                                  ? "border-slate-200 bg-white hover:border-slate-300 [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/80 [.dark_&]:text-white [.dark_&]:hover:border-slate-700"
                                  : "border-slate-100 bg-slate-50 text-slate-500 [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/40 [.dark_&]:text-slate-500"
                          }`}
                        >
                          <span>{day.dayNumber}</span>
                          {label && (
                            <span className="mt-1 rounded-full bg-slate-900 px-2 py-[1px] text-[11px] font-semibold text-white">
                              {label}
                            </span>
                          )}
                          {!disabled && !label && (
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {availDayIds.length === 0 && !availSlotsLoading ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/60 [.dark_&]:text-slate-200">
                      Nessuna disponibilità pubblicata.
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 [.dark_&]:text-slate-300">
                        Blocchi del giorno
                      </p>
                      <p className="text-sm font-semibold text-slate-900 [.dark_&]:text-white">
                        {selectedAvailLabel || "Seleziona una data."}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-500 [.dark_&]:text-slate-300">
                      {availSlotsLoading
                        ? "Carico..."
                        : `${selectedAvailSlots.length} blocchi`}
                    </span>
                  </div>

                  {availSlotsLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm font-semibold text-slate-600 [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/70 [.dark_&]:text-slate-200">
                      Carico i blocchi...
                    </div>
                  ) : availDayIds.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/50 [.dark_&]:text-slate-300">
                      Nessuna disponibilità pubblicata.
                    </div>
                  ) : selectedAvailDayId ? (
                    selectedAvailSlots.length > 0 ? (
                      <div className="max-h-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white p-3 pr-1 [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/70">
                        <div
                          className="relative"
                          style={{ height: availGridMeta.gridHeight }}
                        >
                          <div className="absolute inset-y-0 left-0 w-12 pr-2 text-right text-[11px] font-semibold text-slate-400 [.dark_&]:text-slate-500">
                            {Array.from(
                              { length: availGridMeta.totalHours },
                              (_, idx) => {
                                const hour = availGridMeta.startHour + idx;
                                return (
                                  <div
                                    key={hour}
                                    className="relative"
                                    style={{ height: availGridMeta.hourHeight }}
                                  >
                                    <span className="absolute -top-2 right-2">
                                      {formatHourLabel(hour)}
                                    </span>
                                  </div>
                                );
                              }
                            )}
                          </div>
                          <div className="ml-12 h-full relative">
                            {Array.from(
                              { length: availGridMeta.totalHours + 1 },
                              (_, idx) => (
                                <div
                                  key={idx}
                                  className="absolute left-0 right-0 border-t border-slate-200/70 [.dark_&]:border-slate-700/60"
                                  style={{ top: idx * availGridMeta.hourHeight }}
                                />
                              )
                            )}
                            {selectedAvailSlots.map((slot) => {
                              const top =
                                ((slot.startMinutes -
                                  availGridMeta.startHour * 60) /
                                  60) *
                                availGridMeta.hourHeight;
                              const height = Math.max(
                                24,
                                (slot.durationMin / 60) *
                                  availGridMeta.hourHeight
                              );
                              const endMinutes = slot.endMinutes;
                              const timeRange = `${formatMinutesToTime(
                                slot.startMinutes
                              )} - ${formatMinutesToTime(endMinutes)}`;
                              return (
                                <div
                                  key={slot.id}
                                  className="absolute left-1 right-2 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-500/15 to-sky-400/20 p-2 text-blue-900 shadow-sm [.dark_&]:border-sky-400/30 [.dark_&]:from-sky-500/15 [.dark_&]:to-blue-500/20 [.dark_&]:text-sky-100"
                                  style={{ top, height }}
                                >
                                  <div className="text-[11px] font-semibold">
                                    {timeRange}
                                  </div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-700/80 [.dark_&]:text-sky-200/80">
                                    Disponibile
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/50 [.dark_&]:text-slate-300">
                        Nessuna disponibilità per questo giorno.
                      </div>
                    )
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/50 [.dark_&]:text-slate-300">
                      Seleziona una data per vedere i blocchi disponibili.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 rounded-xl border border-amber-200 [.dark_&]:border-amber-500/40 bg-amber-50 [.dark_&]:bg-amber-500/10 p-3">
              <p className="text-xs font-bold text-amber-700 [.dark_&]:text-amber-200">
                Rimuovi disponibilità specifiche
              </p>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                <label className="text-[11px] font-semibold text-amber-800 [.dark_&]:text-amber-100">
                  Dal
                  <input
                    type="date"
                    value={availDeleteFrom}
                    onChange={(e) => setAvailDeleteFrom(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none [.dark_&]:border-amber-500/40 [.dark_&]:bg-slate-900 [.dark_&]:text-white"
                  />
                </label>
                <label className="text-[11px] font-semibold text-amber-800 [.dark_&]:text-amber-100">
                  Al
                  <input
                    type="date"
                    value={availDeleteTo}
                    onChange={(e) => setAvailDeleteTo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none [.dark_&]:border-amber-500/40 [.dark_&]:bg-slate-900 [.dark_&]:text-white"
                  />
                </label>
                <label className="text-[11px] font-semibold text-amber-800 [.dark_&]:text-amber-100">
                  Dalle
                  <input
                    type="time"
                    value={availDeleteStart}
                    onChange={(e) => setAvailDeleteStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none [.dark_&]:border-amber-500/40 [.dark_&]:bg-slate-900 [.dark_&]:text-white"
                  />
                </label>
                <label className="text-[11px] font-semibold text-amber-800 [.dark_&]:text-amber-100">
                  Alle
                  <input
                    type="time"
                    value={availDeleteEnd}
                    onChange={(e) => setAvailDeleteEnd(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none [.dark_&]:border-amber-500/40 [.dark_&]:bg-slate-900 [.dark_&]:text-white"
                  />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(
                  (d, idx) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setAvailDeleteDays((prev) => {
                          const next = new Set(prev);
                          if (next.has(idx)) next.delete(idx);
                          else next.add(idx);
                          return next;
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                        availDeleteDays.has(idx)
                          ? "border-amber-500 bg-amber-100 text-amber-800 [.dark_&]:border-amber-400 [.dark_&]:bg-amber-500/20 [.dark_&]:text-amber-50"
                          : "border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50 [.dark_&]:border-amber-500/30 [.dark_&]:bg-slate-900 [.dark_&]:text-amber-100 [.dark_&]:hover:bg-amber-500/10"
                      }`}
                    >
                      {d}
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setAvailDeleteMsg(null);
                    try {
                      const token = await getAuth().currentUser?.getIdToken();
                      if (!token) throw new Error("Token non disponibile");
                    const res = await fetch("/api/admin/availability", {
                      method: "DELETE",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        dateFrom: availDeleteFrom,
                        dateTo: availDeleteTo,
                        timeStart: availDeleteStart,
                        timeEnd: availDeleteEnd,
                        daysOfWeek: Array.from(availDeleteDays.values()),
                        tzOffsetMinutes: new Date().getTimezoneOffset(),
                      }),
                    });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
                      setAvailDeleteMsg(`Rimosse ${data?.deleted ?? 0} disponibilità`);
                      await fetchAvailabilitySlots();
                    } catch (err: any) {
                      setAvailDeleteMsg(err?.message || "Errore rimozione");
                    }
                  }}
                  className="ml-auto rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-amber-900 shadow hover:brightness-110"
                >
                  Rimuovi queste disponibilità
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Azioni rapide */}
          <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/60">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300">
                  Azioni rapide
                </p>
                <p className="text-sm text-slate-600 [.dark_&]:text-slate-200">
                  Vai diretto alle funzioni principali.
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Link
                href="/interrogazione"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 hover:scale-105"
              >
                <PlayCircle className="h-4 w-4" /> Interrogazione
              </Link>
              <Link
                href="/risolutore"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 hover:scale-105"
              >
                <ListChecks className="h-4 w-4" /> Risolutore
              </Link>
              <Link
                href="/compiti"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 hover:scale-105"
              >
                <FileText className="h-4 w-4" /> Correggi compiti
              </Link>
              <Link
                href="/simula-verifica"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 hover:scale-105"
              >
                <TimerIcon className="h-4 w-4" /> Simula verifica
              </Link>
            </div>
          </section>

          {isSubscribed && planTier === "Black" && (
            <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-sm [.dark_&]:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                    Check settimanale Black
                  </p>
                  <p className="text-sm text-white/80">
                    20 minuti con il tuo tutor per allineare obiettivi e dubbi.
                  </p>
                </div>
                {isCheckingWeeklyCall || nextBookingLoading ? (
                  <div className="text-sm font-semibold text-white/80">
                    Controllo prenotazioni...
                  </div>
                ) : nextLessonReminder ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">
                    <CalendarClock className="h-4 w-4" aria-hidden />
                    Prossima lezione: {nextLessonReminder.label}
                  </div>
                ) : weeklyCheck?.hasBooking ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">
                    <CalendarClock className="h-4 w-4" aria-hidden />
                    Prossima call: {formatDateTimeLabel(weeklyCheck.startsAt)}
                  </div>
                ) : weeklyCheck ? (
                  <Link
                    href="/black-check-percorso-call"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-400 px-4 py-2 text-sm font-extrabold text-slate-900 shadow-lg shadow-blue-500/30 transition hover:bg-blue-300"
                  >
                    Prenota la call settimanale
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/80">
                    Impossibile verificare le prenotazioni, riprova più tardi.
                  </div>
                )}
              </div>
              {weeklyCheckError && (
                <p className="mt-2 text-xs text-amber-200">
                  Non riesco a verificare le prenotazioni di questa settimana (
                  {weeklyCheckError}). Se non hai già fissato la call, puoi
                  aprire la pagina di prenotazione.
                </p>
              )}
            </section>
          )}

          {/* Temp Access Info */}
          <TempAccessInfo />

          {/* Avatar picker rimosso */}

          {/* PANORAMICA: rimosso blocco badge */}

          {/* PERCORSO (skill path) */}
          <TracksCard savedSlugs={savedLessons || []} profile={profile} />

          {/* VERIFICHE PROGRAMMATE */}
          <ScheduledExamsCard
            onGradeAdded={() => setGradesVersion((v) => v + 1)}
            refreshKey={gradesVersion}
          />

          {/* CONTINUA A STUDIARE */}
          <Card
            title="Continua a studiare"
            subtitle="Riprendi da dove avevi lasciato."
            right={
              <button
                onClick={() => router.push("/matematica")}
                className="text-sm text-blue-700 [.dark_&]:text-sky-300 hover:underline font-semibold"
              >
                Vai al catalogo →
              </button>
            }
          >
            {!savedLessons ? (
              <div className="flex gap-3 overflow-x-auto">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-w-[260px] h-24 rounded-2xl bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : savedLessons.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto scroll-smooth snap-x">
                {savedLessons.map((slug) => (
                  <div
                    key={slug}
                    className="min-w-[280px] snap-start rounded-2xl bg-white [.dark_&]:bg-slate-800 border border-slate-200 p-3 shadow-sm flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-white flex items-center justify-center font-bold">
                      {(slug?.[0] || "L").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate capitalize text-slate-800 [.dark_&]:text-white">
                        {slug.replace(/-/g, " ")}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        /{slug}
                      </div>
                    </div>
                    <Link
                      href={`/${slug}`}
                      className="text-[#1a5fd6] text-sm font-semibold hover:underline"
                    >
                      Apri
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nessuna lezione salvata"
                actionLabel="Esplora le lezioni"
                onAction={() => router.push("/matematica")}
              />
            )}
          </Card>

          {/* VOTI E ANDAMENTO */}
          <GradesCard userId={user.uid} refreshKey={gradesVersion} />

          {/* PROFILO */}
          <div id="profilo" className="h-0" aria-hidden="true" />
          <Card
            title="Profilo"
            subtitle="Personalizza il tuo profilo pubblico."
          >
            <ProfileSection
              userId={user.uid}
              username={username}
              setUsername={setUsername}
              onSaveUsername={handleSaveUsername}
              usernameLoading={usernameLoading}
              usernameSaved={usernameSaved}
              onProfileChange={(patch) =>
                setProfile((p) => ({ ...(p || {}), ...patch }))
              }
            />
          </Card>

          {/* NEWSLETTER */}
          <NewsletterSettings variant="compact" className="w-full" />

          {/* ABBONAMENTO */}
          <Card title="Stato abbonamento">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 [.dark_&]:text-white">
                Il mio piano
              </span>
              <span className="text-sm font-medium truncate">
                {planDisplayLabel}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-slate-600 [.dark_&]:text-white">
                Attivo da
              </span>
              <span className="text-sm font-medium">
                {isSubscribed && subscriptionSince
                  ? formatDate(subscriptionSince)
                  : "—"}
              </span>
            </div>
            <button
              onClick={handleUpgrade}
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white py-2 text-sm font-semibold"
            >
              {isSubscribed ? "Gestisci abbonamento" : "Passa a Black"}
            </button>
          </Card>
        </>
      )}

      {isTutor && scheduleModalOpen ? (
        <FirstExamPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => {
                setScheduleModalOpen(false);
                setEditingBooking(null);
                setScheduleMode("create");
              }}
            />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300">
                    {scheduleMode === "edit"
                      ? "Modifica lezione"
                      : "Nuova lezione"}
                  </p>
                  <p className="text-lg font-bold text-slate-900 [.dark_&]:text-white">
                    {scheduleMode === "edit"
                      ? "Aggiorna data e ora"
                      : "Programma con uno studente"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleModalOpen(false);
                    setEditingBooking(null);
                    setScheduleMode("create");
                  }}
                  className="text-sm text-slate-500 hover:text-slate-800 [.dark_&]:text-slate-300 [.dark_&]:hover:text-white"
                >
                  Chiudi
                </button>
              </div>

              {scheduleMode === "create" && !tutorStudents.length ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 [.dark_&]:border-amber-500/40 [.dark_&]:bg-amber-500/10 [.dark_&]:text-amber-100">
                  Nessuno studente assegnato: assegna uno studente prima di
                  programmare.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {scheduleMode === "edit" ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800/60 [.dark_&]:text-slate-100">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300">
                        Studente
                      </p>
                      <p className="text-sm font-bold text-slate-900 [.dark_&]:text-white">
                        {editingBooking?.fullName || "Studente"}
                      </p>
                      {editingBooking?.email ? (
                        <p className="text-xs font-semibold text-slate-600 [.dark_&]:text-slate-300">
                          {editingBooking.email}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <label className="block text-xs font-semibold text-slate-600 [.dark_&]:text-slate-300">
                      Studente
                      <select
                        value={scheduleStudentId}
                        onChange={(e) => setScheduleStudentId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-white"
                      >
                        {tutorStudents.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.email ? `· ${s.email}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-xs font-semibold text-slate-600 [.dark_&]:text-slate-300">
                      Data
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-white"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-600 [.dark_&]:text-slate-300">
                      Ora
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-white"
                      />
                    </label>
                  </div>

                  {/* Tipo fisso: usiamo il primo disponibile senza mostrarlo */}

                  {scheduleMode === "create" &&
                  selectedScheduleStudent?.phone ? (
                    <p className="text-[11px] font-semibold text-slate-500 [.dark_&]:text-slate-300">
                      Telefono studente: {selectedScheduleStudent.phone}
                    </p>
                  ) : null}
                  {scheduleWillBeUnpaid ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800 [.dark_&]:border-amber-500/40 [.dark_&]:bg-amber-500/10 [.dark_&]:text-amber-100">
                      Ore insufficienti: questa lezione sarà segnata come non
                      pagata.
                    </div>
                  ) : null}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 [.dark_&]:text-slate-300">
                    <input
                      type="checkbox"
                      checked={schedulePast}
                      onChange={(e) => setSchedulePast(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Lezione già svolta (segna come completata)
                  </label>
                  {scheduleError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700 [.dark_&]:border-rose-500/40 [.dark_&]:bg-rose-500/10 [.dark_&]:text-rose-100">
                      {scheduleError}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleModalOpen(false);
                        setScheduleError(null);
                        setEditingBooking(null);
                        setScheduleMode("create");
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 [.dark_&]:border-slate-700 [.dark_&]:text-slate-100 [.dark_&]:hover:bg-slate-800/60"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={handleScheduleSubmit}
                      disabled={
                        scheduleSaving ||
                        (scheduleMode === "create" && !tutorStudents.length)
                      }
                      className="rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
                    >
                      {scheduleSaving
                        ? scheduleMode === "edit"
                          ? "Salvo..."
                          : "Programmo..."
                        : scheduleMode === "edit"
                          ? "Salva modifiche"
                          : "Programma"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </FirstExamPortal>
      ) : null}
    </main>
  );
}

/* ────────────────────── UI helpers ────────────────────── */

function FirstExamPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children as any, document.body);
}

function Card(props: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/80 [.dark_&]:bg-slate-900/60 backdrop-blur border border-slate-200/70 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">{props.title}</h2>
          {props.subtitle && (
            <p className="text-sm text-slate-600 [.dark_&]:text-white/80 mt-0.5">
              {props.subtitle}
            </p>
          )}
        </div>
        {props.right}
      </div>
      <div className="mt-4">{props.children}</div>
    </div>
  );
}

// AvatarCard rimosso

// Lazy render wrapper using IntersectionObserver to render the heavy chart only when in viewport
function LazyChart({ math, phys }: { math: GradeItem[]; phys: GradeItem[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!ref.current || show) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShow(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [show]);
  return (
    <div ref={ref}>
      {show ? (
        <GradesChartRecharts math={math} phys={phys} />
      ) : (
        <div className="mt-2 h-[240px] rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900/60 animate-pulse" />
      )}
    </div>
  );
}

function EmptyState({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-center">
      <p className="text-sm text-slate-600">{title}</p>
      <button
        onClick={onAction}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700"
      >
        <Sparkles className="h-4 w-4" />
        {actionLabel}
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  settingKey,
  defaultOn,
}: {
  label: string;
  settingKey: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(!!defaultOn);
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    setOn((v) => !v);
    setSaving(true);
    try {
      await fetch("/api/me/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingKey, value: !on }),
      });
    } catch {
      setOn((v) => !v);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <button
        onClick={handle}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          on ? "bg-blue-600" : "bg-slate-300"
        }`}
        aria-pressed={on}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            on ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

/* ────────────────────── utils ────────────────────── */

function formatDate(d: Date) {
  try {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDateTimeLabel(input?: string | null) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHoursLabel(val?: number | null) {
  if (val === null || val === undefined) return "—";
  const n = Number(val);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? `${n}h` : `${n.toFixed(1)}h`;
}

function formatEuro(val?: number | null) {
  if (val === null || val === undefined) return "€—";
  const n = Number(val);
  if (!Number.isFinite(n)) return "€—";
  return n.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTutorDayLabel(input?: string | null) {
  if (!input) return { key: "n.d.", label: "Data non disponibile" };
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return { key: input, label: input };
  const key = d.toISOString().slice(0, 10);
  const label = d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return { key, label };
}

function formatTutorTimeRange(
  input?: string | null,
  durationMin?: number | null
) {
  if (!input) return "Orario non disponibile";
  const start = new Date(input);
  if (Number.isNaN(start.getTime())) return "Orario non disponibile";
  const dur = Number(durationMin) > 0 ? Number(durationMin) : 30;
  const end = new Date(start.getTime() + dur * 60_000);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${start.toLocaleTimeString("it-IT", opts)} - ${end.toLocaleTimeString("it-IT", opts)}`;
}

/* ────────────────────── icons ────────────────────── */

function Sparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5 12l2-4 2 4 4 2-4 2-2 4-2-4-4-2 4-2zM17 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM19 13l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
    </svg>
  );
}

function Trash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M3 6h18" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="2" />
      <path d="M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" strokeWidth="2" />
      <path d="M10 11v6M14 11v6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatClass(
  p?: { cycle?: string; year?: number; indirizzo?: string } | null
) {
  if (!p?.year) return "";
  const ord = `${p.year}º`;
  if (p.cycle === "medie") return `${ord} Media`;
  const indir = (p.indirizzo || "").trim() || "Liceo";
  return `${ord} ${indir}`;
}

/* ────────────────────── Profile section ────────────────────── */
function ProfileSection(props: {
  userId: string;
  username: string;
  setUsername: (s: string) => void;
  onSaveUsername: () => Promise<void> | void;
  usernameLoading: boolean;
  usernameSaved: "idle" | "ok" | "err";
  onProfileChange?: (patch: any) => void;
}) {
  const { userId, onProfileChange } = props;
  // classe / indirizzo / obiettivo (persistiti su Firestore)
  type ProfilePrefs = {
    cycle?: "medie" | "liceo" | "altro";
    year?: number; // 1..5 o 1..3
    indirizzo?: string;
    goalMin?: number; // 5..120
    showBadges?: boolean;
  };
  const [prefs, setPrefs] = useState<ProfilePrefs>({
    cycle: "liceo",
    year: 1,
    indirizzo: "Scientifico",
    goalMin: 20,
    showBadges: true,
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/me/profile", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json();
        if (json?.profile) setPrefs((p) => ({ ...p, ...json.profile }));
      } catch {}
    })();
  }, [userId]);

  async function persist(next: Partial<ProfilePrefs>) {
    setPrefs((p) => ({ ...p, ...next }));
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return;
      await fetch("/api/me/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(next),
      });
      onProfileChange?.(next);
    } catch {}
  }

  const years = prefs.cycle === "medie" ? [1, 2, 3] : [1, 2, 3, 4, 5];
  const indirizzi = [
    "Scientifico",
    "Scienze applicate",
    "Classico",
    "ITIS",
    "Linguistico",
    "Altro",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Classe corrente: <strong>{formatClass(prefs) || "—"}</strong>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white px-4 py-2 text-sm font-semibold"
        >
          {open ? "Chiudi" : "Aggiorna classe"}
        </button>
      </div>

      {open && (
        <div className="rounded-2xl bg-white/80 [.dark_&]:bg-slate-900/60 backdrop-blur border border-slate-200 p-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={prefs.cycle}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  cycle: e.target.value as any,
                  year: 1,
                }))
              }
              className="rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
            >
              <option value="medie">Medie</option>
              <option value="liceo">Liceo</option>
              <option value="altro">Altro</option>
            </select>
            <select
              value={prefs.year}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, year: Number(e.target.value) }))
              }
              className="rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}ª
                </option>
              ))}
            </select>
            <select
              value={prefs.indirizzo}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, indirizzo: e.target.value }))
              }
              className="rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
            >
              {indirizzi.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => {
                await persist({
                  cycle: prefs.cycle,
                  year: prefs.year,
                  indirizzo: prefs.indirizzo,
                });
                setOpen(false);
              }}
              className="rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white px-4 py-2 text-sm font-semibold"
            >
              Salva
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-300 [.dark_&]:border-white/20 px-4 py-2 text-sm text-slate-700 [.dark_&]:text-white"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────── Gamification & Grades ────────────────────── */

function isoDay(d = new Date()) {
  const z = new Date(d);
  z.setHours(0, 0, 0, 0);
  return z.toISOString().slice(0, 10);
}
function daysBetweenISO(a: string, b: string) {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db - da) / 86400000);
}

function StreakBadgesCard({
  userId,
  isSubscribed,
  savedCount,
}: {
  userId: string;
  isSubscribed: boolean | null;
  savedCount: number;
}) {
  const key = `tz_streak_${userId}`;
  const [streak, setStreak] = useState<number>(0);
  const [lastDay, setLastDay] = useState<string>(isoDay());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;
        // tick + read
        const res = await fetch("/api/me/streak", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          signal: ac.signal,
        });
        const json = await res.json();
        setStreak(json.count || 0);
        setLastDay(json.lastDate || isoDay());
        setReady(true);
      } catch {}
    })();
    return () => ac.abort();
  }, [key]);

  const badges = useMemo(() => {
    const arr: { id: string; label: string; emoji: string; hint?: string }[] =
      [];
    if (streak >= 3)
      arr.push({
        id: "streak3",
        label: "Streak 3+",
        emoji: "🔥",
        hint: `${streak}g`,
      });
    if (streak >= 7)
      arr.push({ id: "streak7", label: "Settimana di fuoco", emoji: "⚡" });
    if (streak >= 14)
      arr.push({ id: "streak14", label: "Due settimane", emoji: "🏆" });
    if (streak >= 30)
      arr.push({ id: "streak30", label: "Mese leggendario", emoji: "👑" });
    if (savedCount >= 5)
      arr.push({ id: "save5", label: "5 lezioni salvate", emoji: "📚" });
    if (savedCount >= 10)
      arr.push({ id: "save10", label: "10 lezioni salvate", emoji: "🎓" });
    if (!!isSubscribed)
      arr.push({ id: "black", label: "Black Member", emoji: "⚫" });
    return arr;
  }, [streak, savedCount, isSubscribed]);

  return (
    <Card
      title="Streak e Badge"
      subtitle="Tieni viva la serie e colleziona ricompense!"
    >
      {!ready ? (
        <div className="rounded-xl bg-gradient-to-r from-slate-200 to-slate-100 p-6 animate-pulse h-[96px]" />
      ) : (
        <div className="transition-opacity duration-300 opacity-100">
          <div className="rounded-xl bg-gradient-to-r from-orange-400 to-pink-500 text-white p-4 flex items-center justify-between">
            <div>
              <div className="text-sm opacity-95">Streak attuale</div>
              <div className="text-3xl font-extrabold leading-tight">
                {streak} giorni 🔥
              </div>
              <div className="text-xs opacity-90">
                Ultimo accesso: {lastDay}
              </div>
            </div>
            <div className="text-5xl">🔥</div>
          </div>

          {!!badges.length && (
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">Badge</div>
              <ul className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <li
                    key={b.id}
                    className="px-3 py-1.5 rounded-full border border-slate-200 [.dark_&]:border-white/20 text-sm bg-white [.dark_&]:bg-white/10 [.dark_&]:text-white"
                  >
                    <span className="mr-1">{b.emoji}</span>
                    {b.label}
                    {b.hint ? (
                      <span className="opacity-60 ml-1">({b.hint})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function TracksCard({
  savedSlugs,
  profile,
}: {
  savedSlugs: string[];
  profile: any;
}) {
  // Prompt if missing class/year
  const classe = formatClass(profile);
  const [loading, setLoading] = useState(Boolean(classe));
  const [error, setError] = useState<string | null>(null);
  type Row = { title: string; slug: string; categoria?: string[] };
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!classe) {
      setRows([]);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/lessons-by-class?classe=${encodeURIComponent(classe)}`,
          { cache: "no-store", signal: ac.signal }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Errore Sanity");
        setRows(Array.isArray(json.items) ? json.items : []);
      } catch (e: any) {
        setError(e?.message || "Errore");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [classe]);

  if (!classe) {
    return (
      <Card
        title="Imposta la tua classe"
        subtitle="Seleziona classe e indirizzo per sbloccare il percorso personalizzato."
      >
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#profilo"
            className="rounded-xl bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white px-4 py-2 text-sm font-semibold"
          >
            Apri profilo
          </a>
          <span className="text-sm text-slate-600"></span>
        </div>
      </Card>
    );
  }

  const showSkeleton = loading && rows.length === 0;

  if (showSkeleton) {
    return (
      <Card title="Il tuo percorso" subtitle={`Classe: ${classe}`}>
        <div className="space-y-4 animate-pulse">
          <div className="h-5 w-32 rounded-full bg-slate-200 [.dark_&]:bg-white/10" />
          <div className="rounded-2xl border border-slate-200 [.dark_&]:border-white/10 bg-slate-100 [.dark_&]:bg-white/5 h-24" />
          <div className="rounded-2xl border border-slate-200 [.dark_&]:border-white/10 bg-slate-100 [.dark_&]:bg-white/5 h-24" />
          <div className="rounded-2xl border border-slate-200 [.dark_&]:border-white/10 bg-slate-100 [.dark_&]:bg-white/5 h-24" />
        </div>
      </Card>
    );
  }

  // Build tracks from categories
  const categories = new Map<
    string,
    {
      id: string;
      name: string;
      emoji: string;
      lessons: string[];
      titles: Record<string, string>;
    }
  >();
  const em = (name: string) =>
    name.toLowerCase().includes("algebra")
      ? "➗"
      : name.toLowerCase().includes("geom")
        ? "📐"
        : name.toLowerCase().includes("analisi")
          ? "∫"
          : name.toLowerCase().includes("prob")
            ? "🎲"
            : "📘";
  for (const r of rows) {
    const cat = (r.categoria?.[0] as string) || "Altro";
    if (!categories.has(cat)) {
      categories.set(cat, {
        id: cat.toLowerCase().replace(/\s+/g, "-"),
        name: cat,
        emoji: em(cat),
        lessons: [],
        titles: {},
      });
    }
    const entry = categories.get(cat)!;
    entry.lessons.push(r.slug);
    entry.titles[r.slug] = r.title;
  }
  const items = Array.from(categories.values()).map((t) => {
    const total = t.lessons.length;
    const done = t.lessons.filter((slug) =>
      savedSlugs.some((s) => s.includes(slug))
    ).length;
    return { ...t, total, done };
  });

  function Node({
    idx,
    label,
    done,
    slug,
  }: {
    idx: number;
    label: string;
    done: boolean;
    slug?: string;
  }) {
    const content = (
      <>
        <div
          className={`h-14 w-14 rounded-full grid place-items-center text-base font-extrabold shadow-sm transition-transform ${slug ? "hover:scale-110" : ""} ${done ? "bg-emerald-400 text-white" : "bg-blue-500 text-white"}`}
        >
          {done ? "✓" : idx + 1}
        </div>
        <div className="mt-1 text-[11px] leading-tight text-slate-600 text-center truncate w-16">
          {label}
        </div>
      </>
    );

    if (slug) {
      return (
        <Link
          href={`/${slug}`}
          className="flex flex-col items-center w-16 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {content}
        </Link>
      );
    }

    return (
      <div className="flex flex-col items-center w-16 shrink-0">{content}</div>
    );
  }

  function PathLessonCardContent({
    items,
    savedSlugs,
  }: {
    items: Array<{
      id: string;
      name: string;
      emoji: string;
      lessons: string[];
      titles: Record<string, string>;
      total: number;
      done: number;
    }>;
    savedSlugs: string[];
  }) {
    const [showAll, setShowAll] = useState(false);
    const displayedItems = showAll ? items : items.slice(0, 4);
    const hasMore = items.length > 4;

    return (
      <div className="space-y-2">
        {displayedItems.map((t) => (
          <PathItem
            key={t.id}
            emoji={t.emoji}
            name={t.name}
            done={t.done}
            total={t.total}
            lessons={t.lessons}
            titles={t.titles}
            savedSlugs={savedSlugs}
          />
        ))}
        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full px-4 py-2 mt-2 rounded-lg border border-slate-200/70 bg-white/60 [.dark_&]:bg-slate-900/40 hover:bg-white/80 [.dark_&]:hover:bg-slate-900/60 text-slate-700 [.dark_&]:text-slate-300 text-sm font-medium transition-colors"
          >
            Mostra altri percorsi ({items.length - 4})
          </button>
        )}
        {showAll && hasMore && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full px-4 py-2 mt-2 rounded-lg border border-slate-200/70 bg-white/60 [.dark_&]:bg-slate-900/40 hover:bg-white/80 [.dark_&]:hover:bg-slate-900/60 text-slate-700 [.dark_&]:text-slate-300 text-sm font-medium transition-colors"
          >
            Mostra meno
          </button>
        )}
      </div>
    );
  }

  function PathItem({
    emoji,
    name,
    done,
    total,
    lessons,
    titles,
    savedSlugs,
  }: {
    emoji: string;
    name: string;
    done: number;
    total: number;
    lessons: string[];
    titles: Record<string, string>;
    savedSlugs: string[];
  }) {
    const [expanded, setExpanded] = useState(false);
    const percentage = Math.round((done / total) * 100);

    return (
      <div className="rounded-2xl bg-white/80 [.dark_&]:bg-slate-900/60 backdrop-blur border border-slate-200/70 overflow-hidden shadow-sm hover:shadow-md transition-all">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-white/40 [.dark_&]:hover:bg-slate-800/40 transition-colors"
        >
          <span className="text-xl">{emoji}</span>
          <div className="flex-1 text-left">
            <h4 className="font-semibold text-sm text-slate-900 [.dark_&]:text-white">
              {name}
            </h4>
            <div className="mt-1.5 w-full bg-slate-300/40 [.dark_&]:bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs font-medium text-slate-600 [.dark_&]:text-slate-300">
              {done}/{total}
            </span>
            <span
              className={`text-xs font-bold ${percentage === 100 ? "text-emerald-600 [.dark_&]:text-emerald-400" : "text-sky-600 [.dark_&]:text-sky-400"}`}
            >
              {percentage}%
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-slate-500 [.dark_&]:text-slate-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>

        {expanded && (
          <div className="border-t border-slate-200/70 px-4 sm:px-5 py-3 bg-white/40 [.dark_&]:bg-slate-800/20 overflow-x-auto">
            <div className="flex items-start gap-2 pb-1">
              {lessons.slice(0, 12).map((slug, i) => (
                <Node
                  key={slug}
                  idx={i}
                  label={titles[slug] || slug.replace(/-/g, " ")}
                  done={savedSlugs.some((s) => s.includes(slug))}
                  slug={slug}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card title="Il tuo percorso" subtitle={`Classe: ${classe}`}>
      {error && (
        <div className="text-sm text-red-600 [.dark_&]:text-red-400">
          {error}
        </div>
      )}
      {!error && items.length === 0 && (
        <div className="text-sm text-slate-600 [.dark_&]:text-slate-300">
          Stiamo preparando il tuo percorso personalizzato…
        </div>
      )}
      {!error && items.length > 0 && (
        <PathLessonCardContent items={items} savedSlugs={savedSlugs} />
      )}
    </Card>
  );
}

type GradeItem = {
  id: string;
  date: string;
  subject: "matematica" | "fisica";
  grade: number;
};

function GradesCard({
  userId,
  refreshKey,
  onGradeAdded,
}: {
  userId: string;
  refreshKey: number;
  onGradeAdded?: () => void;
}) {
  const storageKey = `tz_grades_${userId}`;
  const [items, setItems] = useState<GradeItem[]>([]);
  const [subject, setSubject] = useState<"matematica" | "fisica">("matematica");
  const [date, setDate] = useState<string>(() => isoDay());
  const [grade, setGrade] = useState<string>("6");
  const [expanded, setExpanded] = useState(false);
  const [addGradeModalOpen, setAddGradeModalOpen] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/me/grades", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: ac.signal,
        });
        const json = await res.json();
        const rows = Array.isArray(json.items) ? json.items : [];
        const cleaned: GradeItem[] = rows
          .map((row: any) => {
            const subj =
              row.subject === "matematica" || row.subject === "fisica"
                ? row.subject
                : null;
            const val = Number(row.grade);
            if (!subj || !Number.isFinite(val)) return null;
            return {
              id: row.id,
              date: row.date,
              subject: subj,
              grade: val,
            } as GradeItem;
          })
          .filter(Boolean) as GradeItem[];
        setItems(cleaned);
      } catch {}
    })();
    return () => ac.abort();
  }, [storageKey, refreshKey]);

  function persist(next: GradeItem[]) {
    setItems(next);
  }

  async function addItem() {
    const raw = Number(grade);
    if (!date || !Number.isFinite(raw)) return;
    const g = Math.max(0, Math.min(10, raw));
    try {
      setSavingGrade(true);
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/me/grades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date, subject, grade: g }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) return;
      const it: GradeItem = { id: json.id, date, subject, grade: g };
      const next = [...items, it].sort((a, b) => a.date.localeCompare(b.date));
      persist(next);
      onGradeAdded?.();
      setGrade("6");
      setDate(isoDay());
      setAddGradeModalOpen(false);
    } catch {
    } finally {
      setSavingGrade(false);
    }
  }

  async function removeItem(id: string) {
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch(`/api/me/grades/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      persist(items.filter((x) => x.id !== id));
    } catch {}
  }

  const math = items.filter((i) => i.subject === "matematica");
  const phys = items.filter((i) => i.subject === "fisica");
  const orderedDesc = useMemo(
    () => items.slice().sort((a, b) => b.date.localeCompare(a.date)),
    [items]
  );
  const visibleRows = useMemo(
    () => (expanded ? orderedDesc : orderedDesc.slice(0, 3)),
    [expanded, orderedDesc]
  );

  // medie semplici
  const avg = (arr: GradeItem[]) =>
    arr.length ? arr.reduce((s, i) => s + i.grade, 0) / arr.length : null;
  const avgMath = useMemo(() => avg(math), [math]);
  const avgPhys = useMemo(() => avg(phys), [phys]);

  return (
    <>
      <Card
        title="Voti e andamento"
        subtitle="Aggiungi i voti e osserva i progressi nel tempo."
        right={
          <button
            onClick={() => setAddGradeModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:border-white/20 [.dark_&]:bg-slate-900 [.dark_&]:text-white"
          >
            <span className="text-lg leading-none">＋</span> Nuovo voto
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          {items.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 [.dark_&]:border-white/30 bg-slate-50 [.dark_&]:bg-slate-900/30 p-4 text-sm text-slate-600 [.dark_&]:text-white/80 flex flex-col gap-2">
              <span>
                Ancora nessun voto registrato. Aggiungine uno per vedere i
                progressi e aggiornare i grafici.
              </span>
              <div>
                <button
                  onClick={() => setAddGradeModalOpen(true)}
                  className="rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white px-4 py-2 text-sm font-semibold hover:opacity-95"
                >
                  Aggiungi il primo voto
                </button>
              </div>
            </div>
          )}

          {/* Recharts-based chart, lazy-loaded and only rendered when visible */}
          <LazyChart math={math} phys={phys} />
          <div className="mt-1 text-[13px] text-slate-700 [.dark_&]:text-white/80 flex flex-wrap gap-4">
            <span>
              Media Matematica:{" "}
              <strong>{avgMath !== null ? avgMath!.toFixed(1) : "—"}</strong>
            </span>
            <span>
              Media Fisica:{" "}
              <strong>{avgPhys !== null ? avgPhys!.toFixed(1) : "—"}</strong>
            </span>
          </div>

          {items.length > 0 && (
            <div className="mt-3 space-y-3">
              {visibleRows.map((it) => {
                const friendlyDateRaw = new Date(
                  `${it.date}T00:00:00`
                ).toLocaleDateString("it-IT", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
                const friendlyDate =
                  friendlyDateRaw.charAt(0).toUpperCase() +
                  friendlyDateRaw.slice(1);
                const subjectLabel =
                  it.subject === "matematica" ? "Matematica" : "Fisica";
                const accent =
                  it.subject === "matematica"
                    ? "from-[#2b7fff] via-[#3d8bff] to-[#55d4ff]"
                    : "from-[#34d399] via-[#20c7ba] to-[#06b6d4]";
                const gradeText = Number.isInteger(it.grade)
                  ? it.grade.toString()
                  : it.grade.toFixed(1);
                return (
                  <div
                    key={it.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.09)] [.dark_&]:border-white/15 [.dark_&]:bg-slate-900/70"
                  >
                    <div className="flex flex-1 items-center gap-4 min-w-0">
                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-lg font-bold text-white shadow-inner shadow-black/20`}
                      >
                        {gradeText}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600 [.dark_&]:text-white/60">
                          {subjectLabel}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-900 [.dark_&]:text-white">
                          <span>{friendlyDate}</span>
                          <span className="rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 [.dark_&]:bg-white/20 [.dark_&]:text-white/70">
                            {it.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removeItem(it.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 text-slate-500 transition hover:border-red-200 hover:bg-red-50/80 hover:text-red-600 [.dark_&]:border-white/15 [.dark_&]:hover:bg-red-500/10 [.dark_&]:hover:text-red-300"
                        title="Rimuovi voto"
                        aria-label="Rimuovi voto"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {items.length > 3 && (
            <div className="mt-2 text-right">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-sm font-semibold text-blue-700 [.dark_&]:text-sky-300 hover:underline"
              >
                {expanded ? "Mostra meno" : `Mostra altri ${items.length - 3}`}
              </button>
            </div>
          )}
        </div>
      </Card>

      {addGradeModalOpen && (
        <FirstExamPortal>
          <div
            className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-grade-title"
            onClick={() => {
              if (!savingGrade) setAddGradeModalOpen(false);
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-900 shadow-2xl p-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 id="add-grade-title" className="text-base font-semibold">
                  Aggiungi un voto
                </h3>
                <button
                  onClick={() => setAddGradeModalOpen(false)}
                  className="rounded-md px-2 py-1 text-sm bg-slate-100 [.dark_&]:bg-white/10 hover:bg-slate-200 [.dark_&]:hover:bg-white/15"
                  aria-label="Chiudi"
                >
                  Chiudi
                </button>
              </div>
              <p className="mt-1 mb-3 text-[12px] text-slate-600 [.dark_&]:text-white/70">
                Registra il voto per aggiornare il grafico e tenere traccia dei
                progressi.
              </p>
              <div className="space-y-3">
                <label className="block text-[12px] font-medium text-slate-700 [.dark_&]:text-white/80">
                  Materia
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
                  >
                    <option value="matematica">Matematica</option>
                    <option value="fisica">Fisica</option>
                  </select>
                </label>
                <label className="block text-[12px] font-medium text-slate-700 [.dark_&]:text-white/80">
                  Data
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
                  />
                </label>
                <label className="block text-[12px] font-medium text-slate-700 [.dark_&]:text-white/80">
                  Voto (0–10)
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
                  />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setAddGradeModalOpen(false)}
                  className="rounded-lg border px-3 py-1.5 text-sm border-slate-300 [.dark_&]:border-white/20"
                >
                  Annulla
                </button>
                <button
                  onClick={addItem}
                  disabled={savingGrade || !date || grade.trim() === ""}
                  className="rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
                >
                  {savingGrade ? "Salvataggio…" : "Salva voto"}
                </button>
              </div>
            </div>
          </div>
        </FirstExamPortal>
      )}
    </>
  );
}

// MiniChart removed in favor of GradesChart (shadcn-style)

/* ────────────────────── Verifiche programmate ────────────────────── */
type ExamItem = {
  id: string;
  date: string;
  subject?: string | null;
  notes?: string | null;
  grade?: number | null;
  grade_subject?: string | null;
  grade_id?: string | null;
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

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseYmdDate(value?: string | null) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getBookingKey(bk: any) {
  return String(bk?.id ?? bk?.slotId ?? bk?.startsAt ?? "");
}

function getBookingStartMs(bk: any) {
  const startsAt = bk?.startsAt;
  if (!startsAt) return null;
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime();
}

function getStudentRemainingMinutes(student: TutorStudent) {
  const rawRemaining = Number(student.remainingPaid);
  if (Number.isFinite(rawRemaining)) {
    return Math.max(0, Math.round(rawRemaining * 60));
  }
  const hoursPaid = Number(student.hoursPaid ?? 0);
  const hoursConsumed = Number(student.hoursConsumed ?? 0);
  if (!Number.isFinite(hoursPaid) || !Number.isFinite(hoursConsumed)) {
    return 0;
  }
  return Math.max(0, Math.round((hoursPaid - hoursConsumed) * 60));
}

function normalizeWhatsAppGroupLink(link?: string | null) {
  if (!link) return null;
  const trimmed = String(link).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (
    trimmed.startsWith("chat.whatsapp.com/") ||
    trimmed.startsWith("whatsapp.com/invite/")
  ) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function stripUnpaidNote(note?: string | null) {
  if (!note) return null;
  const cleaned = note
    .replace(/\s*·?\s*Ora non pagata\s*/gi, " ")
    .trim();
  return cleaned || null;
}

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatMinutesToTime(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const capped = Math.min(24 * 60, safe);
  const h = Math.floor(capped / 60);
  const m = capped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type AvailabilityCalendarDay = {
  id: string;
  dayNumber: number;
  inCurrentMonth: boolean;
};

function buildAvailabilityCalendar(
  monthStart: Date,
  weeks = 6
): AvailabilityCalendarDay[] {
  const firstDay = new Date(monthStart);
  firstDay.setDate(1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday=0
  const gridStart = new Date(firstDay);
  gridStart.setDate(1 - startWeekday);

  const days: AvailabilityCalendarDay[] = [];
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

function toInputTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function monthMatrix(year: number, month: number) {
  // month: 0-11
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: Array<Date | null>[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function CalendarView({
  year,
  month,
  onPrev,
  onNext,
  today,
  selected,
  onSelect,
}: {
  year: number;
  month: number; // 0-11
  onPrev: () => void;
  onNext: () => void;
  today: string; // YYYY-MM-DD
  selected: string | null | undefined; // YYYY-MM-DD
  onSelect: (ds: string) => void;
}) {
  const rows = monthMatrix(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleString("it-IT", {
    month: "long",
    year: "numeric",
  });
  return (
    <div>
      <div className="flex items-center justify-between px-2 py-2">
        <button
          onClick={onPrev}
          className="h-8 w-8 rounded-md hover:bg-slate-100 [.dark_&]:hover:bg-white/10 grid place-items-center"
          aria-label="Mese precedente"
        >
          ‹
        </button>
        <div className="text-sm font-semibold capitalize">{monthLabel}</div>
        <button
          onClick={onNext}
          className="h-8 w-8 rounded-md hover:bg-slate-100 [.dark_&]:hover:bg-white/10 grid place-items-center"
          aria-label="Mese successivo"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-100 [.dark_&]:bg-white/10 rounded-lg overflow-hidden">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
          <div
            key={d}
            className="bg-white [.dark_&]:bg-slate-900 text-center text-xs py-1 font-semibold"
          >
            {d}
          </div>
        ))}
        {rows.flat().map((d, i) => {
          const isEmpty = !d;
          const ds = d ? ymd(d) : "";
          const isToday = d ? ds === today : false;
          const isSelected = selected ? ds === selected : false;
          return (
            <button
              key={i}
              disabled={!d}
              onClick={() => d && onSelect(ymd(d))}
              className={[
                "relative min-h-12 py-2 text-sm bg-white [.dark_&]:bg-slate-900 border border-transparent box-border overflow-hidden",
                !d
                  ? "opacity-50 cursor-default"
                  : "hover:bg-slate-50 [.dark_&]:hover:bg-white/5",
                isSelected ? "border-sky-400 shadow-inner shadow-sky-100" : "",
              ].join(" ")}
            >
              {isSelected ? (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 5 19 19" />
                    <path d="M19 5 5 19" />
                  </svg>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-700 [.dark_&]:text-white/80">
                  {d ? d.getDate() : ""}
                  {isToday && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ExamGradeDraft = {
  grade: string;
  subject: "matematica" | "fisica";
  saving: boolean;
};

function ScheduledExamsCard({
  onGradeAdded,
  refreshKey,
}: {
  onGradeAdded?: () => void;
  refreshKey?: number;
}) {
  const [items, setItems] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // selezione data (header)
  const [date, setDate] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [addGradeValue, setAddGradeValue] = useState<string>("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  // selezione prima verifica (modal stile shadcn)
  const [firstOpen, setFirstOpen] = useState(false);
  const [firstDate, setFirstDate] = useState<string>("");
  const [firstSubject, setFirstSubject] = useState<string>("");
  const [firstNotes, setFirstNotes] = useState<string>("");
  const [firstGradeValue, setFirstGradeValue] = useState<string>("");
  const [gradeDrafts, setGradeDrafts] = useState<
    Record<string, ExamGradeDraft>
  >({});
  const [showAllFuture, setShowAllFuture] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<
    string | null
  >(null);
  const [calendarGradeModal, setCalendarGradeModal] = useState<{
    exam: ExamItem;
    subject: "matematica" | "fisica";
    grade: string;
    saving: boolean;
  } | null>(null);

  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const today = ymd(new Date());
  useEffect(() => {
    if (addModalOpen && !date) {
      setDate(today);
    }
  }, [addModalOpen, date, today]);

  function normalizeSubjectLabel(
    label?: string | null
  ): "matematica" | "fisica" {
    const raw = (label || "").toLowerCase();
    if (raw.includes("fisic")) return "fisica";
    return "matematica";
  }

  function inferSubjectFromExam(exam: ExamItem): "matematica" | "fisica" {
    if (exam.grade_subject) return normalizeSubjectLabel(exam.grade_subject);
    return normalizeSubjectLabel(exam.subject);
  }

  function handleCalendarCellSelect(
    ds: string,
    scheduled: boolean,
    isPastExamDay: boolean
  ) {
    setCalendarSelectedDate(ds);
    if (!scheduled || !isPastExamDay) return;
    const pending = items.find((it) => it.date === ds && !it.grade);
    if (!pending) return;
    setCalendarGradeModal({
      exam: pending,
      subject: inferSubjectFromExam(pending),
      grade: "",
      saving: false,
    });
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/me/exams", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: ac.signal,
        });
        const json = await res.json();
        const list = Array.isArray(json.items)
          ? json.items.map((it: any) => ({
              id: it.id,
              date: it.date,
              subject: it.subject ?? null,
              notes: it.notes ?? null,
              grade: typeof it.grade === "number" ? it.grade : null,
              grade_subject: it.grade_subject ?? null,
              grade_id: it.grade_id ?? null,
            }))
          : [];
        setItems(list);
        setHasFetchedOnce(true);
      } catch (e: any) {
        setError(e?.message || "Errore");
        setHasFetchedOnce(true);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [refreshKey]);

  async function addExam(
    dateOverride?: string,
    subjectOverride?: string,
    notesOverride?: string,
    gradeOverride?: string
  ) {
    const useDate = ((dateOverride ?? date) || "").trim();
    const useSubject = ((subjectOverride ?? subject) || "").trim();
    const useNotes = ((notesOverride ?? notes) || "").trim();
    const gradeSource =
      gradeOverride !== undefined ? gradeOverride : addGradeValue;
    const useGradeRaw = (gradeSource || "").trim();
    if (!useDate || !useSubject) return;
    const invokedWithOverrides =
      dateOverride !== undefined ||
      subjectOverride !== undefined ||
      notesOverride !== undefined ||
      gradeOverride !== undefined;
    const usedDefaultFields =
      dateOverride === undefined &&
      subjectOverride === undefined &&
      notesOverride === undefined &&
      gradeOverride === undefined;
    try {
      setAdding(true);
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/me/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: useDate,
          subject: useSubject || null,
          notes: useNotes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Errore");
      const next = [
        ...items,
        {
          id: json.id,
          date: useDate,
          subject: useSubject || null,
          notes: useNotes || null,
          grade: null,
          grade_subject: null,
          grade_id: null,
        },
      ].sort((a, b) => a.date.localeCompare(b.date));
      setItems(next);
      // Se è la prima verifica, centra la vista su quel mese
      const d = new Date(useDate + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSubject("");
      setNotes("");
      if (usedDefaultFields) {
        setDate("");
        setAddGradeValue("");
      }
      if (addModalOpen) {
        setAddModalOpen(false);
      }
      const shouldAttachGrade = useGradeRaw !== "" && useDate < today;
      if (shouldAttachGrade) {
        const numeric = Number(useGradeRaw);
        if (Number.isFinite(numeric)) {
          const bounded = Math.max(0, Math.min(10, numeric));
          await persistGradeOnServer(
            json.id,
            bounded,
            normalizeSubjectLabel(useSubject)
          );
        }
      }
    } catch (e) {
      // no-op
    } finally {
      setAdding(false);
    }
  }

  function updateGradeDraft(id: string, patch: Partial<ExamGradeDraft>) {
    setGradeDrafts((prev) => {
      const current = prev[id] || {
        grade: "",
        subject: "matematica",
        saving: false,
      };
      return { ...prev, [id]: { ...current, ...patch } };
    });
  }

  async function persistGradeOnServer(
    examId: string,
    value: number,
    subject: "matematica" | "fisica"
  ) {
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) throw new Error("missing_token");
    const res = await fetch(
      `/api/me/exams/${encodeURIComponent(examId)}/grade`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          grade: value,
          subject,
        }),
      }
    );
    const json = await res.json();
    if (!res.ok || !json?.ok) throw new Error(json?.error || "Errore");
    const payload = json.grade;
    setItems((prev) =>
      prev.map((it) =>
        it.id === examId
          ? {
              ...it,
              grade: payload?.grade ?? value,
              grade_subject: payload?.subject ?? subject,
              grade_id: payload?.id ?? it.grade_id ?? null,
            }
          : it
      )
    );
    onGradeAdded?.();
  }

  async function saveGradeForExam(examId: string) {
    const draft = gradeDrafts[examId] || {
      grade: "",
      subject: "matematica",
      saving: false,
    };
    const value = Number(draft.grade);
    if (!Number.isFinite(value)) return;
    const bounded = Math.max(0, Math.min(10, value));
    updateGradeDraft(examId, { saving: true });
    try {
      await persistGradeOnServer(examId, bounded, draft.subject);
      updateGradeDraft(examId, { grade: "", saving: false });
    } catch (err) {
      console.error(err);
      updateGradeDraft(examId, { saving: false });
    }
  }

  async function handleCalendarGradeSave() {
    if (!calendarGradeModal) return;
    const value = Number(calendarGradeModal.grade);
    if (!Number.isFinite(value)) return;
    const bounded = Math.max(0, Math.min(10, value));
    setCalendarGradeModal((prev) => (prev ? { ...prev, saving: true } : prev));
    try {
      await persistGradeOnServer(
        calendarGradeModal.exam.id,
        bounded,
        calendarGradeModal.subject
      );
      setCalendarGradeModal(null);
      setCalendarSelectedDate(null);
    } catch (err) {
      console.error(err);
      setCalendarGradeModal((prev) =>
        prev ? { ...prev, saving: false } : prev
      );
    }
  }

  async function removeExam(id: string) {
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch(`/api/me/exams/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setItems(items.filter((x) => x.id !== id));
      setGradeDrafts((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {}
  }

  const hasAny = items.length > 0;
  const upcomingItems = [...items]
    .filter((it) => it.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pastItemsSorted = [...items]
    .filter((it) => it.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const upcomingList = showAllFuture
    ? upcomingItems
    : upcomingItems.slice(0, 3);
  const pastList = showAllPast ? pastItemsSorted : pastItemsSorted.slice(0, 3);
  const addDateIsPast = Boolean(date && date < today);
  const firstDateIsPast = Boolean(firstDate && firstDate < today);

  const renderExamCard = (it: ExamItem, bucket: "future" | "past") => {
    const rem = daysBetweenISO(today, it.date);
    let label: string;
    if (rem < 0) {
      label = new Date(`${it.date}T00:00:00`).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
      });
    } else if (rem === 0) {
      label = "È oggi";
    } else if (rem === 1) {
      label = "Domani";
    } else {
      label = `Tra ${rem}g`;
    }

    const draft = gradeDrafts[it.id] || {
      grade: "",
      subject: "matematica",
      saving: false,
    };
    const canAddGrade = rem <= 0 && !it.grade;

    const accent =
      bucket === "future"
        ? "from-[#2b7fff] to-[#55d4ff]"
        : "from-[#34d399] to-[#06b6d4]";
    const labelChipClass =
      bucket === "future"
        ? "bg-sky-100 text-sky-700 [.dark_&]:bg-sky-500/25 [.dark_&]:text-sky-100"
        : "bg-emerald-100 text-emerald-700 [.dark_&]:bg-emerald-500/25 [.dark_&]:text-emerald-100";

    const friendlyDate = (() => {
      const parsed = new Date(`${it.date}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return it.date;
      const formatted = parsed.toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    })();

    return (
      <div
        key={it.id}
        className="relative overflow-hidden rounded-2xl border border-slate-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-900/40 p-3 shadow-sm"
      >
        <span
          className={`pointer-events-none absolute left-4 right-4 top-0 h-1 rounded-b-full bg-gradient-to-r ${accent}`}
          aria-hidden="true"
        />
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-900 [.dark_&]:text-white">
              {friendlyDate}
            </div>
            <div className="text-xs text-slate-500 [.dark_&]:text-white/60">
              {it.date}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
              <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-slate-600 [.dark_&]:border-white/20 [.dark_&]:text-white/70">
                {it.subject || "Materia"}
              </span>
              {typeof it.grade === "number" && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 [.dark_&]:bg-emerald-500/25 [.dark_&]:text-emerald-100">
                  {it.grade.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${labelChipClass}`}
            >
              {label}
            </span>
            <button
              onClick={() => removeExam(it.id)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 [.dark_&]:border-white/20 [.dark_&]:text-white/60"
              aria-label="Rimuovi"
              title="Rimuovi"
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        </div>
        {canAddGrade ? (
          <div className="mt-3 space-y-1 text-xs text-slate-600 [.dark_&]:text-white/70">
            <div className="flex flex-wrap gap-2">
              <select
                value={draft.subject}
                onChange={(e) =>
                  updateGradeDraft(it.id, {
                    subject: e.target.value as "matematica" | "fisica",
                  })
                }
                className="rounded-lg border px-2 py-1 text-xs bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
              >
                <option value="matematica">Matematica</option>
                <option value="fisica">Fisica</option>
              </select>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={draft.grade}
                onChange={(e) =>
                  updateGradeDraft(it.id, {
                    grade: e.target.value,
                  })
                }
                placeholder="Voto"
                className="rounded-lg border px-2 py-1 text-xs w-24 bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
              />
              <button
                onClick={() => saveGradeForExam(it.id)}
                disabled={draft.saving || String(draft.grade).trim() === ""}
                className="rounded-lg bg-emerald-500 text-white px-3 py-1 text-xs font-semibold disabled:opacity-60"
              >
                {draft.saving ? "Salvataggio…" : "Salva voto"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Card
      title="Verifiche programmate"
      subtitle={
        hasAny
          ? "Gestisci le date e tieni d'occhio il calendario."
          : "Aggiungi la tua prossima verifica per sbloccare il calendario."
      }
      right={
        hasAny ? (
          <button
            onClick={() => {
              if (!date) setDate(today);
              setAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:border-white/20 [.dark_&]:bg-slate-900 [.dark_&]:text-white"
          >
            <span className="text-lg leading-none">＋</span> Nuova verifica
          </button>
        ) : null
      }
    >
      {loading || !hasFetchedOnce ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
          <div className="rounded-xl border border-slate-200 [.dark_&]:border-white/10 bg-slate-100 [.dark_&]:bg-white/5 h-[300px]" />
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 [.dark_&]:border-white/10 bg-slate-100 [.dark_&]:bg-white/5 h-24" />
            <div className="rounded-xl border border-slate-200 [.dark_&]:border-white/10 bg-slate-100 [.dark_&]:bg-white/5 h-24" />
            <div className="rounded-xl border border-slate-200 [.dark_&]:border-white/10 bg-slate-100 [.dark_&]:bg-white/5 h-24" />
          </div>
        </div>
      ) : !hasAny ? (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <button
            onClick={() => setFirstOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white px-6 py-3 text-base sm:text-lg font-extrabold shadow hover:opacity-95 active:scale-[0.99]"
          >
            Programma la tua prima verifica
          </button>

          {firstOpen && (
            <FirstExamPortal>
              <div
                className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="first-exam-title"
                onClick={() => {
                  setFirstOpen(false);
                  setFirstGradeValue("");
                }}
              >
                <div
                  className="w-full max-w-md sm:rounded-2xl rounded-t-2xl border border-slate-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-900 shadow-2xl p-4 max-h-[85vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <h3
                      id="first-exam-title"
                      className="text-base font-semibold"
                    >
                      Scegli una data
                    </h3>
                    <button
                      onClick={() => {
                        setFirstOpen(false);
                        setFirstGradeValue("");
                      }}
                      className="rounded-md px-2 py-1 text-sm bg-slate-100 [.dark_&]:bg-white/10 hover:bg-slate-200 [.dark_&]:hover:bg-white/15"
                      aria-label="Chiudi"
                    >
                      Chiudi
                    </button>
                  </div>
                  <p className="mt-1 mb-2 text-[12px] text-slate-600 [.dark_&]:text-white/70">
                    Tocca un giorno nel calendario per selezionarlo.
                  </p>
                  <CalendarView
                    year={viewYear}
                    month={viewMonth}
                    onPrev={() => {
                      const m = viewMonth - 1;
                      if (m < 0) {
                        setViewMonth(11);
                        setViewYear(viewYear - 1);
                      } else setViewMonth(m);
                    }}
                    onNext={() => {
                      const m = viewMonth + 1;
                      if (m > 11) {
                        setViewMonth(0);
                        setViewYear(viewYear + 1);
                      } else setViewMonth(m);
                    }}
                    today={today}
                    selected={firstDate}
                    onSelect={(ds) => setFirstDate(ds)}
                  />
                  <label className="mt-3 block text-[12px] font-medium text-slate-700 [.dark_&]:text-white/80">
                    Materia *
                    <input
                      type="text"
                      placeholder="Es. Matematica, Fisica"
                      value={firstSubject}
                      onChange={(e) => setFirstSubject(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
                      required
                    />
                  </label>
                  <label className="mt-3 block text-[12px] font-medium text-slate-700 [.dark_&]:text-white/80">
                    Argomenti / Nota
                    <textarea
                      placeholder="Es. Disequazioni, moto rettilineo…"
                      value={firstNotes}
                      onChange={(e) => setFirstNotes(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
                      rows={3}
                    />
                  </label>
                  {firstDateIsPast && (
                    <label className="mt-3 block text-[12px] font-medium text-slate-700 [.dark_&]:text-white/80">
                      Voto (0–10)
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={firstGradeValue}
                        onChange={(e) => setFirstGradeValue(e.target.value)}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
                      />
                    </label>
                  )}
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setFirstOpen(false);
                        setFirstGradeValue("");
                      }}
                      className="rounded-lg border px-3 py-1.5 text-sm border-slate-300 [.dark_&]:border-white/20"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={async () => {
                        if (!firstDate || !firstSubject.trim()) return;
                        await addExam(
                          firstDate,
                          firstSubject,
                          firstNotes,
                          firstDateIsPast ? firstGradeValue : ""
                        );
                        setFirstOpen(false);
                        setFirstDate("");
                        setFirstSubject("");
                        setFirstNotes("");
                        setFirstGradeValue("");
                      }}
                      disabled={!firstDate || !firstSubject.trim()}
                      className="rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
                    >
                      Conferma
                    </button>
                  </div>
                </div>
              </div>
            </FirstExamPortal>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Calendario mese */}
          <div className="rounded-xl border border-slate-200 [.dark_&]:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 [.dark_&]:bg-white/5">
              <button
                onClick={() => {
                  const m = viewMonth - 1;
                  if (m < 0) {
                    setViewMonth(11);
                    setViewYear(viewYear - 1);
                  } else setViewMonth(m);
                }}
                className="h-8 w-8 rounded-md hover:bg-slate-200/70 [.dark_&]:hover:bg-white/10 grid place-items-center"
                aria-label="Mese precedente"
              >
                ‹
              </button>
              <div className="text-sm font-semibold">
                {new Date(viewYear, viewMonth, 1).toLocaleString("it-IT", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <button
                onClick={() => {
                  const m = viewMonth + 1;
                  if (m > 11) {
                    setViewMonth(0);
                    setViewYear(viewYear + 1);
                  } else setViewMonth(m);
                }}
                className="h-8 w-8 rounded-md hover:bg-slate-200/70 [.dark_&]:hover:bg-white/10 grid place-items-center"
                aria-label="Mese successivo"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200 [.dark_&]:bg-white/10">
              {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
                <div
                  key={d}
                  className="bg-white [.dark_&]:bg-slate-900 text-center text-xs py-1 font-semibold"
                >
                  {d}
                </div>
              ))}
              {monthMatrix(viewYear, viewMonth)
                .flat()
                .map((d, i) => {
                  const key = i;
                  const ds = d ? ymd(d) : "";
                  const scheduled = Boolean(
                    d && items.some((it) => it.date === ds)
                  );
                  const isPastExamDay = scheduled && ds < today;
                  const isToday = d ? ds === today : false;
                  const isSelectedDay =
                    calendarSelectedDate && ds
                      ? calendarSelectedDate === ds
                      : false;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        d &&
                        handleCalendarCellSelect(ds, scheduled, isPastExamDay)
                      }
                      disabled={!d}
                      className={[
                        "relative min-h-16 bg-white [.dark_&]:bg-slate-900 p-1 flex flex-col justify-between border border-transparent box-border overflow-hidden",
                        scheduled
                          ? "border-sky-400 shadow-inner shadow-sky-100 cursor-pointer"
                          : "cursor-default",
                        isSelectedDay ? "ring-2 ring-sky-300" : "",
                      ].join(" ")}
                      title={
                        scheduled
                          ? "Verifica programmata"
                          : d
                            ? "Nessuna verifica"
                            : undefined
                      }
                    >
                      {scheduled && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          {isPastExamDay ? (
                            <svg
                              className="h-6 w-6 sm:h-7 sm:w-7"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#34d399"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M4.5 12.3 9.5 17l10-10.5" />
                            </svg>
                          ) : (
                            <svg
                              className="h-6 w-6 sm:h-7 sm:w-7"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M5 5 19 19" />
                              <path d="M19 5 5 19" />
                            </svg>
                          )}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-700 [.dark_&]:text-white/80 flex items-center gap-1">
                        {d ? d.getDate() : ""}
                        {isToday && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                        )}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Lista verifiche */}
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-900/40 p-4 shadow-sm">
              <header className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400 [.dark_&]:text-white/50">
                    Pianificazione
                  </p>
                  <h3 className="text-base font-semibold text-slate-900 [.dark_&]:text-white">
                    Prossime verifiche
                  </h3>
                </div>
                {upcomingItems.length > 3 && (
                  <button
                    onClick={() => setShowAllFuture((v) => !v)}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-500 [.dark_&]:text-sky-300"
                  >
                    {showAllFuture
                      ? "Mostra meno"
                      : `Mostra tutte (${upcomingItems.length})`}
                  </button>
                )}
              </header>
              <div className="mt-4 space-y-2">
                {upcomingList.length === 0 ? (
                  <p className="text-sm text-slate-600 [.dark_&]:text-white/70">
                    Nessuna verifica imminente.
                  </p>
                ) : (
                  upcomingList.map((exam) => renderExamCard(exam, "future"))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-900/40 p-4 shadow-sm">
              <header className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400 [.dark_&]:text-white/50">
                    Debrief
                  </p>
                  <h3 className="text-base font-semibold text-slate-900 [.dark_&]:text-white">
                    Verifiche appena concluse
                  </h3>
                </div>
                {pastItemsSorted.length > 3 && (
                  <button
                    onClick={() => setShowAllPast((v) => !v)}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-500 [.dark_&]:text-sky-300"
                  >
                    {showAllPast
                      ? "Mostra meno"
                      : `Mostra tutte (${pastItemsSorted.length})`}
                  </button>
                )}
              </header>
              <div className="mt-4 space-y-2">
                {pastList.length === 0 ? (
                  <p className="text-sm text-slate-600 [.dark_&]:text-white/70">
                    Ancora nessun risultato recente.
                  </p>
                ) : (
                  pastList.map((exam) => renderExamCard(exam, "past"))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
      {addModalOpen && (
        <FirstExamPortal>
          <div
            className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-exam-title"
            onClick={() => {
              if (!adding) {
                setAddModalOpen(false);
                setAddGradeValue("");
              }
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-900 shadow-2xl p-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 id="add-exam-title" className="text-base font-semibold">
                  Nuova verifica
                </h3>
                <button
                  onClick={() => {
                    if (adding) return;
                    setAddModalOpen(false);
                    setAddGradeValue("");
                  }}
                  className="rounded-md px-2 py-1 text-sm bg-slate-100 [.dark_&]:bg-white/10 hover:bg-slate-200 [.dark_&]:hover:bg-white/15"
                  aria-label="Chiudi"
                >
                  Chiudi
                </button>
              </div>
              <p className="mt-1 mb-3 text-[12px] text-slate-600 [.dark_&]:text-white/70">
                Seleziona la data e aggiungi qualche dettaglio utile da
                ricordare.
              </p>
              <CalendarView
                year={viewYear}
                month={viewMonth}
                onPrev={() => {
                  const m = viewMonth - 1;
                  if (m < 0) {
                    setViewMonth(11);
                    setViewYear(viewYear - 1);
                  } else setViewMonth(m);
                }}
                onNext={() => {
                  const m = viewMonth + 1;
                  if (m > 11) {
                    setViewMonth(0);
                    setViewYear(viewYear + 1);
                  } else setViewMonth(m);
                }}
                today={today}
                selected={date}
                onSelect={(ds) => setDate(ds)}
              />
              <label className="mt-3 block text-[12px] font-medium text-slate-700 [.dark_&]:text-white/80">
                Materia *
                <input
                  type="text"
                  placeholder="Es. Matematica, Fisica"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
                  required
                />
              </label>
              <label className="mt-3 block text-[12px] font-medium text-slate-700 [.dark_&]:text-white/80">
                Argomenti / Nota
                <textarea
                  placeholder="Es. Sistemi lineari, studio di funzione…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
                  rows={3}
                />
              </label>
              {addDateIsPast && (
                <label className="mt-3 block text-[12px] font-medium text-slate-700 [.dark_&]:text-white/80">
                  Voto (0–10)
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={addGradeValue}
                    onChange={(e) => setAddGradeValue(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
                  />
                </label>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    if (adding) return;
                    setAddModalOpen(false);
                    setAddGradeValue("");
                  }}
                  className="rounded-lg border px-3 py-1.5 text-sm border-slate-300 [.dark_&]:border-white/20"
                >
                  Annulla
                </button>
                <button
                  onClick={() =>
                    addExam(
                      undefined,
                      undefined,
                      undefined,
                      addDateIsPast ? addGradeValue : ""
                    )
                  }
                  disabled={adding || !date || !subject.trim()}
                  className="rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
                >
                  {adding ? "Salvataggio…" : "Aggiungi verifica"}
                </button>
              </div>
            </div>
          </div>
        </FirstExamPortal>
      )}
      {calendarGradeModal && (
        <FirstExamPortal>
          <div
            className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-grade-title"
            onClick={() => {
              if (!calendarGradeModal.saving) setCalendarGradeModal(null);
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-slate-900 shadow-2xl p-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3
                  id="calendar-grade-title"
                  className="text-base font-semibold"
                >
                  Registra il voto
                </h3>
                <button
                  onClick={() => setCalendarGradeModal(null)}
                  className="rounded-md px-2 py-1 text-sm bg-slate-100 [.dark_&]:bg-white/10 hover:bg-slate-200 [.dark_&]:hover:bg-white/15"
                  aria-label="Chiudi"
                  disabled={calendarGradeModal.saving}
                >
                  Chiudi
                </button>
              </div>
              <div className="mt-2 text-sm text-slate-600 [.dark_&]:text-white/80 space-y-1">
                <div>
                  {(() => {
                    const parsed = new Date(
                      `${calendarGradeModal.exam.date}T00:00:00`
                    );
                    const label = Number.isNaN(parsed.getTime())
                      ? calendarGradeModal.exam.date
                      : parsed.toLocaleDateString("it-IT", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                        });
                    return `Verifica del ${label}`;
                  })()}
                </div>
                {calendarGradeModal.exam.subject && (
                  <div className="font-semibold">
                    {calendarGradeModal.exam.subject}
                  </div>
                )}
                {calendarGradeModal.exam.notes && (
                  <div className="text-xs text-slate-500 [.dark_&]:text-white/60">
                    {calendarGradeModal.exam.notes}
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-3">
                <label className="block text-[12px] font-medium text-slate-700 [.dark_&]:text-white/80">
                  Materia
                  <select
                    value={calendarGradeModal.subject}
                    onChange={(e) =>
                      setCalendarGradeModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              subject: e.target.value as
                                | "matematica"
                                | "fisica",
                            }
                          : prev
                      )
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
                  >
                    <option value="matematica">Matematica</option>
                    <option value="fisica">Fisica</option>
                  </select>
                </label>
                <label className="block text-[12px] font-medium text-slate-700 [.dark_&]:text-white/80">
                  Voto (0–10)
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={calendarGradeModal.grade}
                    onChange={(e) =>
                      setCalendarGradeModal((prev) =>
                        prev ? { ...prev, grade: e.target.value } : prev
                      )
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 [.dark_&]:bg-slate-900 [.dark_&]:text-white [.dark_&]:border-white/20"
                  />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setCalendarGradeModal(null)}
                  className="rounded-lg border px-3 py-1.5 text-sm border-slate-300 [.dark_&]:border-white/20"
                  disabled={calendarGradeModal.saving}
                >
                  Annulla
                </button>
                <button
                  onClick={handleCalendarGradeSave}
                  disabled={
                    calendarGradeModal.saving ||
                    calendarGradeModal.grade.trim() === ""
                  }
                  className="rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
                >
                  {calendarGradeModal.saving ? "Salvataggio…" : "Salva voto"}
                </button>
              </div>
            </div>
          </div>
        </FirstExamPortal>
      )}
    </Card>
  );
}
("/* eslint-disable @typescript-eslint/no-unused-vars */\n");
("/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions */\n");
