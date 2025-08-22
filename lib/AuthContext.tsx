"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";

export type AppUser = {
  uid: string;
  email: string | null;
  displayName?: string | null;
  username?: string | null;
  createdAt?: number;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  isSubscribed: boolean | null;
  savedLessons: string[];
  refreshSavedLessons: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false, // non bloccare l’UI iniziale
  isSubscribed: null,
  savedLessons: [],
  refreshSavedLessons: async () => {},
  logout: async () => {},
});

const runWhenIdle = (cb: () => void) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as any).requestIdleCallback(cb);
  } else {
    setTimeout(cb, 0);
  }
};

/* ─────────────────────────────
   SUBSCRIPTION OVERRIDES
   - Configurabili via env (NEXT_PUBLIC_SUB_OVERRIDES="a@b.com,c@d.com")
   - Oppure con array locale (solo dev)
   ATTENZIONE: essendo client-side, le email sono visibili nel bundle.
   Se ti serve privacy totale, sposta la logica server-side in un endpoint.
────────────────────────────── */
const LOCAL_SUB_OVERRIDES = [
  "luigi.miraglia006@gmail.com",
  "ermatto@gmail.com",
];

const ENV_SUB_OVERRIDES = (process.env.NEXT_PUBLIC_SUB_OVERRIDES || "")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);

const ALL_OVERRIDES = new Set(
  [...LOCAL_SUB_OVERRIDES, ...ENV_SUB_OVERRIDES].map((e) => e.toLowerCase())
);

const isEmailOverridden = (email?: string | null) =>
  !!email && ALL_OVERRIDES.has(email.toLowerCase());

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [savedLessons, setSavedLessons] = useState<string[]>([]);

  const refreshSavedLessons = async () => {
    if (!user) return;
    try {
      const [{ getDoc, doc }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("./firebase"),
      ]);
      const userDoc = await getDoc(doc(db, "users", user.uid));
      setSavedLessons(
        userDoc.exists() ? userDoc.data().savedLessons || [] : []
      );
    } catch (err) {
      console.error("Errore caricamento lezioni salvate:", err);
      setSavedLessons([]);
    }
  };

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

          // Firestore & Stripe dopo un piccolo idle per non contendere il main thread
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

            try {
              // --- SUBSCRIPTION STATUS (con override e cache 10 min) ---
              if (appUser.email) {
                const email = appUser.email.toLowerCase();
                const cacheKey = `sub:${email}`;

                // 1) Override: se in whitelist, set true e cache
                if (isEmailOverridden(email)) {
                  setIsSubscribed(true);
                  sessionStorage.setItem(
                    cacheKey,
                    JSON.stringify({ v: true, t: Date.now(), src: "override" })
                  );
                  return;
                }

                // 2) Cache
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                  const { v, t } = JSON.parse(cached) as {
                    v: boolean;
                    t: number;
                  };
                  if (Date.now() - t < 10 * 60 * 1000) {
                    setIsSubscribed(v);
                    return;
                  }
                }

                // 3) Stripe (fallback)
                const resp = await fetch(
                  "/api/stripe/subscription-status-by-email",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                    keepalive: false,
                  }
                );
                const data = await resp.json();
                const v = !!data.isSubscribed;
                setIsSubscribed(v);
                sessionStorage.setItem(
                  cacheKey,
                  JSON.stringify({ v, t: Date.now(), src: "stripe" })
                );
              } else {
                setIsSubscribed(false);
              }
            } catch (err) {
              console.error("Stripe status fetch error", err);
              setIsSubscribed(false);
            }
          });
        }
      );
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const logout = async () => {
    const [{ auth }, { signOut }] = await Promise.all([
      import("./firebase"),
      import("firebase/auth"),
    ]);
    await signOut(auth);
    setUser(null);
    setIsSubscribed(false);
    setSavedLessons([]);

    // opzionale: pulisci la cache di sub dell'utente appena uscito
    try {
      const email = auth.currentUser?.email?.toLowerCase();
      if (email) sessionStorage.removeItem(`sub:${email}`);
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
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
