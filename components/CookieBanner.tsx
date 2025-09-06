"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAnonId } from "@/lib/anonId";
import { useAuth } from "@/lib/AuthContext";

type ConsentCategories = {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

type StoredConsent = {
  v: string; // version
  t: number; // timestamp
  cat: ConsentCategories;
  src?: "banner" | "settings";
};

const CONSENT_KEY = "tz_consent_v2";
const VERSION = process.env.NEXT_PUBLIC_CONSENT_VERSION || "v1";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

function updateConsentMode(cat: ConsentCategories) {
  try {
    const base: Record<string, "granted" | "denied"> = {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: cat.analytics ? "granted" : "denied",
      functionality_storage: cat.preferences ? "granted" : "denied",
      security_storage: "granted", // strictly necessary
    };
    window.gtag?.("consent", "update", base);
  } catch {}
}

function readStored(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (!parsed?.v || parsed.v !== VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function logConsent(decision: {
  categories: ConsentCategories;
  action: "accept_all" | "reject_all" | "custom";
  source: "banner" | "settings";
  anonId?: string | null;
  userId?: string | null;
}) {
  try {
    await fetch("/api/consent/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...decision, version: VERSION }),
      keepalive: true,
    });
  } catch {}
}

export default function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [cat, setCat] = useState<ConsentCategories>({
    analytics: false,
    marketing: false,
    preferences: false,
  });
  const { user } = useAuth();

  // Open on first visit or when requested
  useEffect(() => {
    const stored = readStored();
    if (!stored) setOpen(true);
    const onOpen = () => setOpen(true);
    window.addEventListener("tz:open-cookie-manager", onOpen);
    return () => window.removeEventListener("tz:open-cookie-manager", onOpen);
  }, []);

  // Restore switches when showing prefs
  useEffect(() => {
    const stored = readStored();
    if (stored) setCat(stored.cat);
  }, [open]);

  const save = useCallback(
    async (decision: "accept_all" | "reject_all" | "custom") => {
      const c: ConsentCategories =
        decision === "accept_all"
          ? { analytics: true, marketing: false, preferences: true }
          : decision === "reject_all"
            ? { analytics: false, marketing: false, preferences: false }
            : cat;

      // Persist
      const payload: StoredConsent = {
        v: VERSION,
        t: Date.now(),
        cat: c,
        src: "banner",
      };
      try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
        const expires = new Date(
          Date.now() + 180 * 24 * 60 * 60 * 1000
        ).toUTCString();
        document.cookie = `tz_consent=${encodeURIComponent(
          JSON.stringify({ v: payload.v, t: payload.t, c: c })
        )}; path=/; expires=${expires}; samesite=lax`;
      } catch {}

      // Consent Mode update
      updateConsentMode(c);

      // If analytics granted and GA is not loaded yet, load it on demand
      try {
        const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID as
          | string
          | undefined;
        const hasGtag =
          typeof window !== "undefined" &&
          typeof (window as any).gtag === "function";
        if (c.analytics && GA_ID && !hasGtag) {
          // init dataLayer + gtag
          (window as any).dataLayer = (window as any).dataLayer || [];
          (window as any).gtag = (...args: any[]) => {
            (window as any).dataLayer.push(args);
          };
          // load script
          const s = document.createElement("script");
          s.async = true;
          s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
          document.head.appendChild(s);
          // init config
          (window as any).gtag("js", new Date());
          (window as any).gtag("config", GA_ID, {
            anonymize_ip: true,
            send_page_view: false,
          });
        }
      } catch {}

      // Log decision
      const anon = getAnonId();
      await logConsent({
        categories: c,
        action: decision,
        source: "banner",
        anonId: anon,
        userId: user?.uid || null,
      });

      setOpen(false);
    },
    [cat, user?.uid]
  );

  const BannerUI = useMemo(() => {
    if (!open) return null;
    return (
      <div
        className="fixed inset-x-2 bottom-2 z-[100] sm:inset-x-auto sm:right-4 sm:bottom-4 max-w-md rounded-2xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4">
          <div className="text-[15px] font-bold">Cookie su Theoremz 🍪</div>
          <p className="mt-1 text-[13.5px] text-slate-600">
            Usiamo cookie essenziali per il sito e, solo se acconsenti, cookie
            di analisi per migliorare l’esperienza. Nessuna pubblicità.
          </p>

          {!showPrefs ? (
            <div className="mt-3 flex flex-wrap gap-1 sm:gap-2">
              <button
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-2 sm:px-4 py-2 text-[13.5px] font-extrabold text-white hover:bg-slate-800"
                onClick={() => save("reject_all")}
              >
                Rifiuta
              </button>
              <button
                className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-2 sm:px-4 py-2 text-[13.5px] font-bold text-slate-900 hover:bg-slate-200"
                onClick={() => setShowPrefs(true)}
              >
                Preferenze
              </button>
              <button
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-2 sm:px-4 py-2 text-[13.5px] font-extrabold text-white hover:from-sky-600 hover:to-sky-500"
                onClick={() => save("accept_all")}
              >
                Accetta tutto
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <Toggle
                label="Necessari"
                desc="Sempre attivi per sicurezza e funzionalità di base."
                checked={true}
                disabled
              />
              <Toggle
                label="Preferenze"
                desc="Ricorda scelte dell’utente (es. tema)."
                checked={cat.preferences}
                onChange={(v) => setCat((c) => ({ ...c, preferences: v }))}
              />
              <Toggle
                label="Analisi"
                desc="Statistiche anonime per migliorare i contenuti."
                checked={cat.analytics}
                onChange={(v) => setCat((c) => ({ ...c, analytics: v }))}
              />
              <Toggle
                label="Marketing"
                desc="Non usati su Theoremz (disattivati)."
                checked={cat.marketing}
                disabled
              />

              <div className="mt-3 flex gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-[13.5px] font-bold text-slate-900 hover:bg-slate-200"
                  onClick={() => setShowPrefs(false)}
                >
                  Indietro
                </button>
                <button
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-[13.5px] font-extrabold text-white hover:from-sky-600 hover:to-sky-500"
                  onClick={() => save("custom")}
                >
                  Salva preferenze
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [open, showPrefs, cat, save]);

  return BannerUI;
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 ${disabled ? "opacity-70" : ""}`}
    >
      <div>
        <div className="text-[13.5px] font-bold">{label}</div>
        <div className="text-[12.5px] text-slate-600">{desc}</div>
      </div>
      <label
        className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span className="absolute h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-blue-600 transition-colors"></span>
        <span className="absolute left-0.5 h-5 w-5 translate-x-0 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></span>
      </label>
    </div>
  );
}
