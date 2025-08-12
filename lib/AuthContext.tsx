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
  loading: false, // ⬅️ non bloccare l’UI iniziale
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
              if (appUser.email) {
                // cache 10 min
                const key = `sub:${appUser.email}`;
                const cached = sessionStorage.getItem(key);
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
                const resp = await fetch(
                  "/api/stripe/subscription-status-by-email",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: appUser.email }),
                    keepalive: false,
                  }
                );
                const data = await resp.json();
                const v = !!data.isSubscribed;
                setIsSubscribed(v);
                sessionStorage.setItem(
                  key,
                  JSON.stringify({ v, t: Date.now() })
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
