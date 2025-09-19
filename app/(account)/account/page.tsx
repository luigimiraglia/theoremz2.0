"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getAuth } from "firebase/auth";
import dynamic from "next/dynamic";
const GradesChartRecharts = dynamic(() => import("@/components/GradesChartRecharts"), {
  ssr: false,
  loading: () => (
    <div className="mt-2 h-[240px] rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900/60 animate-pulse" />
  ),
});

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

  /* ------------ FIX robusto per subscriptionSince / daysSubscribed ------------ */
  // 1) Normalizza qualsiasi cosa tu abbia in user.createdAt
  const subscriptionSinceMs = useMemo(
    () => toMs(user?.createdAt),
    [user?.createdAt]
  );

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
  /* --------------------------------------------------------------------------- */

  // UI state: none (pagina unica, sezioni verticali)

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
    window.location.href = "/black";
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

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-cyan-600 via-blue-600 to-sky-600 text-white shadow-[0_10px_40px_rgba(37,99,235,0.35)]">
        <div className="absolute inset-0 opacity-25 mix-blend-overlay bg-[radial-gradient(ellipse_at_top_left,white,transparent_50%)]" />
        <div className="relative p-5 sm:p-8 flex items-center gap-4">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white/20 flex items-center justify-center text-xl sm:text-2xl font-bold">
            {avatarLetter}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                Ciao, {friendlyName}!
              </h1>
              {/* Year badge if set */}
              {profile?.year && (
                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs bg-white/20 px-2.5 py-1 rounded-full">
                  🎓 {formatClass(profile)}
                </span>
              )}
              {isSubscribed ? (
                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs bg-white/20 px-2.5 py-1 rounded-full">
                  <Sparkles className="h-3.5 w-3.5" />
                  Attivo
                  {daysSubscribed ? (
                    <span className="opacity-90">da {daysSubscribed}g</span>
                  ) : null}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs bg-black/20 px-2.5 py-1 rounded-full">
                  <Lock className="h-3.5 w-3.5" />
                  Free
                </span>
              )}
            </div>
            <p className="text-white/90 text-xs sm:text-sm mt-1 truncate">
              {user.email}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleUpgrade}
                className="rounded-lg bg-white/15  hover:bg-white/25 px-3 py-1.5 text-sm"
              >
                {isSubscribed ? "Gestisci abbonamento" : "Passa a Black"}
              </button>
              <button
                onClick={() => router.push("/simula-verifica")}
                className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm"
              >
                Simula verifica
              </button>
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
      </section>

      {/* PANORAMICA */}
      <StreakBadgesCard
        userId={user.uid}
        isSubscribed={isSubscribed}
        savedCount={savedLessons?.length || 0}
      />

      {/* PERCORSO (skill path) */}
      <TracksCard savedSlugs={savedLessons || []} profile={profile} />

      {/* CONTINUA A STUDIARE */}
      <Card
        title="Continua a studiare"
        subtitle="Riprendi da dove avevi lasciato."
        right={
          <button
            onClick={() => router.push("/matematica")}
            className="text-sm text-blue-700 hover:underline"
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
                  <div className="text-xs text-slate-500 truncate">/{slug}</div>
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
      <GradesCard userId={user.uid} />

      {/* PROFILO */}
      <div id="profilo" className="h-0" aria-hidden="true" />
      <Card title="Profilo" subtitle="Personalizza il tuo profilo pubblico.">
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

      {/* ABBONAMENTO */}
      <Card title="Stato abbonamento">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 [.dark_&]:text-white">
            Livello
          </span>
          <span className="text-sm font-medium">
            {isSubscribed ? "Black" : "Free"}
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
    </main>
  );
}

/* ────────────────────── UI helpers ────────────────────── */

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

// Lazy render wrapper using IntersectionObserver to render the heavy chart only when in viewport
function LazyChart({ math, phys }: { math: GradeItem[]; phys: GradeItem[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!ref.current || show) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setShow(true);
          io.disconnect();
          break;
        }
      }
    }, { rootMargin: "200px" });
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

/* ────────────────────── icons ────────────────────── */

function Sparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5 12l2-4 2 4 4 2-4 2-2 4-2-4-4-2 4-2zM17 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM19 13l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
    </svg>
  );
}
function Lock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V11a1 1 0 011-1h1zm2 0h8V8a4 4 0 00-8 0v2z" />
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              className="rounded-lg border px-3 py-2 text-sm"
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
              className="rounded-lg border px-3 py-2 text-sm"
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
              className="rounded-lg border px-3 py-2 text-sm"
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
              className="rounded-lg border px-4 py-2 text-sm"
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
                    className="px-3 py-1.5 rounded-full border text-sm bg-white"
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  type Row = { title: string; slug: string; categoria?: string[] };
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!classe) return;
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
  }: {
    idx: number;
    label: string;
    done: boolean;
  }) {
    return (
      <div className="flex flex-col items-center w-16 shrink-0">
        <div
          className={`h-14 w-14 rounded-full grid place-items-center text-base font-extrabold shadow-sm ${done ? "bg-emerald-400 text-white" : "bg-blue-500 text-white"}`}
        >
          {done ? "✓" : idx + 1}
        </div>
        <div className="mt-1 text-[11px] leading-tight text-slate-600 text-center truncate w-16">
          {label}
        </div>
      </div>
    );
  }

  return (
    <Card title="Il tuo percorso" subtitle={`Classe: ${classe}`}>
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 bg-slate-100 animate-pulse h-[120px]"
            />
          ))}
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity duration-300 opacity-100">
          {items.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl p-4 bg-white/70 [.dark_&]:bg-slate-900/50 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{t.emoji}</span>
                <h3 className="font-extrabold">{t.name}</h3>
                <span className="ml-auto text-xs rounded-full bg-slate-100 px-2 py-0.5">
                  {t.done}/{t.total}
                </span>
              </div>
              <div className="relative overflow-x-auto">
                <div className="flex items-start gap-4 py-1">
                  {t.lessons.slice(0, 8).map((slug, i) => (
                    <Node
                      key={slug}
                      idx={i}
                      label={t.titles[slug] || slug.replace(/-/g, " ")}
                      done={savedSlugs.some((s) => s.includes(slug))}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
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

function GradesCard({ userId }: { userId: string }) {
  const storageKey = `tz_grades_${userId}`;
  const [items, setItems] = useState<GradeItem[]>([]);
  const [subject, setSubject] = useState<"matematica" | "fisica">("matematica");
  const [date, setDate] = useState<string>(() => isoDay());
  const [grade, setGrade] = useState<string>("6");

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
        setItems(rows);
      } catch {}
    })();
    return () => ac.abort();
  }, [storageKey]);

  function persist(next: GradeItem[]) {
    setItems(next);
  }

  async function addItem() {
    const g = Math.max(0, Math.min(10, Number(grade)));
    if (!date || !Number.isFinite(g)) return;
    try {
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
    } catch {}
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

  // medie semplici
  const avg = (arr: GradeItem[]) =>
    arr.length ? arr.reduce((s, i) => s + i.grade, 0) / arr.length : null;
  const avgMath = useMemo(() => avg(math), [math]);
  const avgPhys = useMemo(() => avg(phys), [phys]);

  return (
    <Card
      title="Voti e andamento"
      subtitle="Aggiungi i voti e osserva i progressi nel tempo."
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as any)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="matematica">Matematica</option>
            <option value="fisica">Fisica</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Voto (0–10)"
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <button
            onClick={addItem}
            className="rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white px-3 py-2 text-sm font-semibold hover:opacity-95"
          >
            Aggiungi
          </button>
        </div>

        {/* Recharts-based chart, lazy-loaded and only rendered when visible */}
        <LazyChart math={math} phys={phys} />
        <div className="mt-1 text-[13px] text-slate-700 flex flex-wrap gap-4">
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
          <ul className="mt-2 max-h-48 overflow-auto divide-y">
            {items
              .slice()
              .reverse()
              .map((it) => (
                <li
                  key={it.id}
                  className="py-1.5 flex items-center justify-between text-sm"
                >
                  <span className="opacity-70 w-28 capitalize">
                    {it.subject}
                  </span>
                  <span className="w-28">{it.date}</span>
                  <span className="font-semibold w-10 text-right">
                    {it.grade}
                  </span>
                  <button
                    onClick={() => removeItem(it.id)}
                    className="ml-2 text-red-600 hover:underline"
                  >
                    Rimuovi
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// MiniChart removed in favor of GradesChart (shadcn-style)
