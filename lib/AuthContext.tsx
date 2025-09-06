// lib/AuthContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { track } from "@/lib/analytics";

/* =========================
   Tipi
========================= */
export type AppUser = {
  uid: string;
  email: string | null;
  displayName?: string | null;
  username?: string | null;
  createdAt?: number;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean; // lasciamo false per non bloccare l'UI
  isSubscribed: boolean | null; // null = non ancora determinato
  savedLessons: string[];
  refreshSavedLessons: () => Promise<void>;
  forceRefreshSubscription: () => Promise<void>;
  logout: () => Promise<void>;
};

/* =========================
   Utils
========================= */
const runWhenIdle = (cb: () => void) => {
  try {
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(cb);
    } else {
      setTimeout(cb, 0);
    }
  } catch {
    setTimeout(cb, 0);
  }
};

/* =========================
   Subscription overrides
   - Nessun hard-code in production!
   - Env: NEXT_PUBLIC_SUB_OVERRIDES="a@b.com,c@d.com"
========================= */
const LOCAL_SUB_OVERRIDES =
  process.env.NODE_ENV === "development" ? ["ermatto@gmail.com"] : [];

const ENV_SUB_OVERRIDES = (process.env.NEXT_PUBLIC_SUB_OVERRIDES || "")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);

const ALL_OVERRIDES = new Set(
  [...LOCAL_SUB_OVERRIDES, ...ENV_SUB_OVERRIDES].map((e) => e.toLowerCase())
);

const isEmailOverridden = (email?: string | null) =>
  !!email && ALL_OVERRIDES.has(email.toLowerCase());

/* =========================
   Cache versionata
   - Bump NEXT_PUBLIC_CACHE_VERSION per invalidare le cache client
========================= */
const CACHE_NS = process.env.NEXT_PUBLIC_CACHE_VERSION || "v1";
const subKey = (email: string) => `sub:${email}:${CACHE_NS}`;

/* =========================
   Context
========================= */
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  isSubscribed: null,
  savedLessons: [],
  refreshSavedLessons: async () => {},
  forceRefreshSubscription: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading] = useState(false); // niente spinner globale
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [savedLessons, setSavedLessons] = useState<string[]>([]);
  const [reportedSubForEmail, setReportedSubForEmail] = useState<string | null>(null);

  /* ---------- Preferiti ---------- */
  const refreshSavedLessons = async () => {
    if (!user) return;
    try {
      const [{ getDoc, doc }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("./firebase"),
      ]);
      const snap = await getDoc(doc(db, "users", user.uid));
      setSavedLessons(snap.exists() ? snap.data().savedLessons || [] : []);
    } catch (err) {
      console.error("Errore caricamento lezioni salvate:", err);
      setSavedLessons([]);
    }
  };

  /* ---------- Auth & profilo ---------- */
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    runWhenIdle(async () => {
      const [{ auth }, { onAuthStateChanged }] = await Promise.all([
        import("./firebase"),
        import("firebase/auth"),
      ]);

      unsubscribe = onAuthStateChanged(
        auth,
        async (fbUser: FirebaseUser | null) => {
          if (!fbUser) {
            setUser(null);
            setIsSubscribed(false);
            setSavedLessons([]);
            return;
          }

          const appUser: AppUser = {
            uid: fbUser.uid,
            email: fbUser.email ?? null,
            displayName: fbUser.displayName ?? null,
            createdAt: fbUser.metadata?.creationTime
              ? Date.parse(fbUser.metadata.creationTime)
              : undefined,
          };
          setUser(appUser);

          // Carica profilo/username/salvati quando inattivo
          runWhenIdle(async () => {
            try {
              const [{ getDoc, doc }, { db }] = await Promise.all([
                import("firebase/firestore"),
                import("./firebase"),
              ]);
              const snap = await getDoc(doc(db, "users", fbUser.uid));
              if (snap.exists()) {
                appUser.username = snap.data().username || null;
                setSavedLessons(snap.data().savedLessons || []);
              }
            } catch (err) {
              console.error("Errore Firestore", err);
            }

            // Stato abbonamento
            await computeSubscription(appUser.email);
          });
        }
      );
    });

    return () => {
      try {
        unsubscribe?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When subscription becomes active for a user, send a one-time analytics event per session
  useEffect(() => {
    try {
      if (!user?.email) return;
      if (!isSubscribed) return;
      const email = user.email.toLowerCase();
      if (reportedSubForEmail === email) return;
      track("subscription_active", { method: "stripe_status_check" });
      setReportedSubForEmail(email);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscribed, user?.email]);

  /* ---------- Calcolo stato abbonamento (con cache/override) ---------- */
  const computeSubscription = async (emailNullable: string | null) => {
    try {
      if (!emailNullable) {
        setIsSubscribed(false);
        return;
      }

      const email = emailNullable.toLowerCase();
      const key = subKey(email);

      // Se la cache era nata da override ma ora non è più override → invalida
      const raw = sessionStorage.getItem(key);
      if (raw) {
        try {
          const cached = JSON.parse(raw) as {
            v: boolean;
            t: number;
            src?: string;
          };
          if (cached.src === "override" && !isEmailOverridden(email)) {
            sessionStorage.removeItem(key);
          }
        } catch {}
      }

      // Override attivo → true immediato + cache
      if (isEmailOverridden(email)) {
        setIsSubscribed(true);
        sessionStorage.setItem(
          key,
          JSON.stringify({ v: true, t: Date.now(), src: "override" })
        );
        return;
      }

      // Cache valida (10 min)
      const cachedRaw = sessionStorage.getItem(key);
      if (cachedRaw) {
        try {
          const { v, t } = JSON.parse(cachedRaw) as { v: boolean; t: number };
          if (Date.now() - t < 10 * 60 * 1000) {
            setIsSubscribed(v);
            return;
          }
        } catch {}
      }

      // Fallback Stripe (endpoint App Router)
      const resp = await fetch("/api/stripe/subscription-status-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        cache: "no-store",
        keepalive: false,
      });

      // Evita parse error su 4xx/5xx
      if (!resp.ok) {
        console.error("Stripe endpoint error", resp.status);
        setIsSubscribed(false);
        return;
      }

      const data = await resp.json();
      const v = !!data.isSubscribed;
      setIsSubscribed(v);
      sessionStorage.setItem(
        key,
        JSON.stringify({ v, t: Date.now(), src: "stripe" })
      );
    } catch (err) {
      console.error("Stripe status fetch error", err);
      setIsSubscribed(false);
    }
  };

  /* ---------- Refresh manuale (pannello utente) ---------- */
  const forceRefreshSubscription = async () => {
    try {
      const email = user?.email?.toLowerCase();
      if (!email) return;
      sessionStorage.removeItem(subKey(email));
      await computeSubscription(email);
    } catch {
      // no-op
    }
  };

  /* ---------- Logout ---------- */
  const logout = async () => {
    const [{ auth }, { signOut }] = await Promise.all([
      import("./firebase"),
      import("firebase/auth"),
    ]);

    // salva email per ripulire la cache dopo il signOut
    const emailLower = auth.currentUser?.email?.toLowerCase();

    await signOut(auth);
    setUser(null);
    setIsSubscribed(false);
    setSavedLessons([]);

    try {
      if (emailLower) sessionStorage.removeItem(subKey(emailLower));
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSubscribed,
        savedLessons,
        refreshSavedLessons,
        forceRefreshSubscription,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================
   Hook
========================= */
export function useAuth() {
  return useContext(AuthContext);
}
