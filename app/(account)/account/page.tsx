"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getAuth } from "firebase/auth";

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

  const subscriptionSince = useMemo(() => {
    return typeof user?.createdAt === "number"
      ? new Date(user.createdAt)
      : null;
  }, [user]);

  const daysSubscribed = useMemo(() => {
    if (!subscriptionSince || !isSubscribed) return null;
    const diffMs = Date.now() - subscriptionSince.getTime();
    return Math.max(1, Math.round(diffMs / 86_400_000));
  }, [subscriptionSince, isSubscribed]);

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

  const handleManageSubscription = async () => {
    try {
      const res = await fetch("/api/billing/portal");
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
    } catch {}
  };

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
    <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
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
              {isSubscribed ? (
                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs bg-white/20 px-2.5 py-1 rounded-full">
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium
                  {daysSubscribed ? (
                    <span className="opacity-90">• da {daysSubscribed}g</span>
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
                onClick={handleManageSubscription}
                className="rounded-lg bg-white/15  hover:bg-white/25 px-3 py-1.5 text-sm"
              >
                {isSubscribed ? "Gestisci abbonamento" : "Passa a Premium"}
              </button>
              <button
                onClick={doLogout}
                className="rounded-lg bg-black/20 hover:bg-black/30 px-3 py-1.5 text-sm"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profilo */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Profilo" subtitle="Gestisci il tuo profilo pubblico.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium [.dark_&]:text-white text-slate-700">
                  Username
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="es. theoremz_fan"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                  <button
                    onClick={handleSaveUsername}
                    disabled={usernameLoading || !username?.trim()}
                    className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {usernameLoading ? "…" : "Salva"}
                  </button>
                </div>
                {usernameSaved === "ok" && (
                  <p className="text-emerald-600 text-xs mt-1">
                    Username aggiornato!
                  </p>
                )}
                {usernameSaved === "err" && (
                  <p className="text-red-600 text-xs mt-1">
                    Errore durante il salvataggio.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 [.dark_&]:text-white">
                  ID Utente
                </label>
                <input
                  value={user.uid}
                  readOnly
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm [.dark_&]:text-slate-700 bg-slate-50"
                />
              </div>
            </div>
          </Card>

          {/* Lezioni salvate */}
          <Card
            title="Lezioni salvate"
            subtitle="Riprendi da dove avevi lasciato."
            right={
              <button
                onClick={() => router.push("/lezioni")}
                className="text-sm text-blue-700 hover:underline"
              >
                Vai al catalogo →
              </button>
            }
          >
            {!savedLessons ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : savedLessons.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedLessons.map((slug) => (
                  <li
                    key={slug}
                    className="group rounded-lg border p-3 hover:shadow-md transition bg-white  flex items-center gap-3"
                  >
                    <div className="h-12 w-12 rounded-lg bg-indigo-100 text-blue-700 flex items-center justify-center font-bold">
                      {(slug?.[0] || "L").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate capitalize text-slate-700">
                        {slug.replace(/-/g, " ")}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        /{slug}
                      </div>
                    </div>
                    <Link
                      href={`/${slug}`}
                      className="text-blue-700 text-sm hover:underline"
                    >
                      Apri
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Nessuna lezione salvata"
                actionLabel="Esplora le lezioni"
                onAction={() => router.push("/matematica")}
              />
            )}
          </Card>
        </div>

        {/* Pannello laterale */}
        <div className="space-y-6">
          <Card title="Stato abbonamento">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 [.dark_&]:text-white">
                Livello
              </span>
              <span className="text-sm font-medium">
                {isSubscribed ? "Premium" : "Free"}
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
              onClick={handleManageSubscription}
              className="mt-4 w-full rounded-lg bg-blue-600 text-white py-2 text-sm hover:bg-blue-700"
            >
              {isSubscribed ? "Gestisci abbonamento" : "Passa a Premium"}
            </button>
          </Card>

          <Card title="Preferenze">
            <ToggleRow
              label="Email con novità e sconti"
              settingKey="emails_marketing"
            />
          </Card>

          <Card title="Sicurezza">
            <div className="space-y-2">
              <button
                onClick={() => router.push("/reset-password")}
                className="w-full rounded-lg px-3 py-2 text-sm font-semibold border-2 text-red-600 hover:bg-gray-50 text-left"
              >
                Cambia password
              </button>
            </div>
          </Card>
        </div>
      </section>
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
    <div className="rounded-2xl border bg-white [.dark_&]:bg-slate-800 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">{props.title}</h2>
          {props.subtitle && (
            <p className="text-sm text-slate-600 [.dark_&]:text-white mt-0.5">
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

// function formatRelative(iso: string) {
//   const d = new Date(iso);
//   if (isNaN(+d)) return "";
//   const diff = Date.now() - d.getTime();
//   const mins = Math.round(diff / 60000);
//   if (mins < 60) return `${mins} min fa`;
//   const hrs = Math.round(mins / 60);
//   if (hrs < 24) return `${hrs} h fa`;
//   const days = Math.round(hrs / 24);
//   return `${days} g fa`;
// }

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
