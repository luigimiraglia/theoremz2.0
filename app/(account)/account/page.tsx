/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions */
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getAuth } from "firebase/auth";
import { PlayCircle, Timer as TimerIcon, FileText, ListChecks, BookOpen } from "lucide-react";
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

  // UI state: none (pagina unica, sezioni verticali)
  const [gradesVersion, setGradesVersion] = useState(0);

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

  // Badges component per riutilizzo
  const BadgesRow = () => (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Year badge if set */}
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
          <span className="font-bold text-white">
            {planDisplayLabel}
          </span>
          {subscriptionDuration && (
            <span className="text-white/80 font-medium ml-0.5">
              · {subscriptionDuration}
            </span>
          )}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs bg-black/20 px-2.5 py-1 rounded-full">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V11a1 1 0 011-1h1zm2 0h8V8a4 4 0 00-8 0v2z" />
          </svg>
          Free
        </span>
      )}
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-cyan-600 via-blue-600 to-sky-600 text-white shadow-[0_10px_40px_rgba(37,99,235,0.35)]">
        <div className="absolute inset-0 opacity-25 mix-blend-overlay bg-[radial-gradient(ellipse_at_top_left,white,transparent_50%)]" />
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

      {/* Azioni rapide */}
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/60">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300">
              Azioni rapide
            </p>
            <p className="text-sm text-slate-600 [.dark_&]:text-slate-200">Vai diretto alle funzioni principali.</p>
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
      <GradesCard userId={user.uid} refreshKey={gradesVersion} />

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

      {/* NEWSLETTER */}
      <NewsletterSettings variant="compact" className="w-full" />

      {/* ABBONAMENTO */}
      <Card title="Stato abbonamento">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 [.dark_&]:text-white">
            Il mio piano
          </span>
          <span className="text-sm font-medium truncate">{planDisplayLabel}</span>
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
    } catch {}
    finally {
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
                const friendlyDateRaw = new Date(`${it.date}T00:00:00`).toLocaleDateString(
                  "it-IT",
                  { weekday: "short", day: "numeric", month: "short" }
                );
                const friendlyDate =
                  friendlyDateRaw.charAt(0).toUpperCase() + friendlyDateRaw.slice(1);
                const subjectLabel = it.subject === "matematica" ? "Matematica" : "Fisica";
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

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
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

  function normalizeSubjectLabel(label?: string | null): "matematica" | "fisica" {
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
    setCalendarGradeModal((prev) =>
      prev ? { ...prev, saving: true } : prev
    );
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
  const upcomingList = showAllFuture ? upcomingItems : upcomingItems.slice(0, 3);
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

    const draft =
      gradeDrafts[it.id] || {
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
                              subject: e.target
                                .value as "matematica" | "fisica",
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
                  {calendarGradeModal.saving
                    ? "Salvataggio…"
                    : "Salva voto"}
                </button>
              </div>
            </div>
          </div>
        </FirstExamPortal>
      )}
    </Card>
  );
}
"/* eslint-disable @typescript-eslint/no-unused-vars */\n"
"/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions */\n"
