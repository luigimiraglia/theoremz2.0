// lib/AuthContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { identify, track } from "@/lib/analytics";
import { hasTempAccess, getTempAccessInfo } from "@/lib/temp-access";

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

type SubscriptionInfo = {
  isSubscribed: boolean;
  source: "stripe" | "override" | "temp_access";
  tempAccessInfo?: {
    expiresAt: string;
    reason?: string;
    grantedAt?: string;
  };
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean; // lasciamo false per non bloccare l'UI
  isSubscribed: boolean | null; // null = non ancora determinato
  subscriptionInfo: SubscriptionInfo | null; // informazioni dettagliate sulla subscription
  savedLessons: string[];
  refreshSavedLessons: () => Promise<void>;
  forceRefreshSubscription: () => Promise<void>;
  checkNewSubscription: () => Promise<void>; // per controllare dopo un nuovo acquisto
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
   - Temp access: hardcoded emails con scadenza
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

const isEmailOverridden = (email?: string | null) => {
  if (!email) return false;

  // Check permanent overrides (env vars)
  if (ALL_OVERRIDES.has(email.toLowerCase())) return true;

  // Check temporary access with expiration
  return hasTempAccess(email);
};

/* =========================
   Cache versionata
   - Bump NEXT_PUBLIC_CACHE_VERSION per invalidare le cache client
   - v2: Improved case-insensitive email handling (Oct 29, 2025)
========================= */
const CACHE_NS = process.env.NEXT_PUBLIC_CACHE_VERSION || "v2";
const subKey = (email: string) => `sub:${email}:${CACHE_NS}`;

// Utility per debugging cache (disponibile in console del browser)
if (typeof window !== "undefined") {
  (window as any).clearAllSubscriptionCache = () => {
    const keys = Object.keys(sessionStorage);
    const subKeys = keys.filter((k) => k.startsWith("sub:"));
    subKeys.forEach((key) => sessionStorage.removeItem(key));
    console.log(
      `Cleared ${subKeys.length} subscription cache entries:`,
      subKeys
    );
  };

  // Utility per testare il controllo di nuovi abbonamenti
  (window as any).checkNewSubscription = () => {
    console.log("Use useAuth().checkNewSubscription() instead");
  };
}

/* =========================
   Context
========================= */
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  isSubscribed: null,
  subscriptionInfo: null,
  savedLessons: [],
  refreshSavedLessons: async () => {},
  forceRefreshSubscription: async () => {},
  checkNewSubscription: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading] = useState(false); // niente spinner globale
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] =
    useState<SubscriptionInfo | null>(null);
  const [savedLessons, setSavedLessons] = useState<string[]>([]);
  const [reportedSubForEmail, setReportedSubForEmail] = useState<string | null>(
    null
  );
  const [lastBlackSyncKey, setLastBlackSyncKey] = useState<string | null>(null);

  /* ---------- Preferiti ---------- */
  const refreshSavedLessons = async () => {
    if (!user) {
      setSavedLessons([]);
      return;
    }
    try {
      const [{ getAuth }] = await Promise.all([import("firebase/auth")]);
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("missing_token");
      const res = await fetch("/api/me/saved-lessons", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_failed");
      const data = await res.json();
      const slugs =
        (Array.isArray(data.items) ? data.items : [])
          .map((item: any) => item?.slug || item?.lessonId)
          .filter(Boolean) || [];
      setSavedLessons(slugs);
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
            setSubscriptionInfo(null);
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
          try {
            identify(fbUser.uid);
          } catch (err) {
            console.error("Errore identify analytics:", err);
          }

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
  }, []);

  useEffect(() => {
    refreshSavedLessons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const [{ getAuth }] = await Promise.all([import("firebase/auth")]);
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;

        let sessionId: string | null = null;
        if (typeof window !== "undefined") {
          sessionId = window.sessionStorage.getItem("tz_session_id");
          if (!sessionId) {
            sessionId = `sess_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 9)}`;
            window.sessionStorage.setItem("tz_session_id", sessionId);
          }
        }

        const todayKey = sessionId ? `access:${sessionId}` : `access:${user.uid}`;
        const today = new Date().toISOString().slice(0, 10);
        if (typeof window !== "undefined") {
          const last = window.sessionStorage.getItem(todayKey);
          if (last === today) return;
        }

        const res = await fetch("/api/me/access-log", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({ sessionId }),
        });
        if (res.ok && typeof window !== "undefined") {
          window.sessionStorage.setItem(todayKey, today);
        }
      } catch (error) {
        console.warn("[auth] access log failed", error);
      }
    })();
  }, [user?.uid]);

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

  useEffect(() => {
    if (!user?.uid || isSubscribed !== true) return;
    runWhenIdle(async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const sessionId =
          typeof window !== "undefined"
            ? sessionStorage.getItem("tz_session_id")
            : null;
        const syncKey = `${user.uid}:${today}:${sessionId || "nosession"}`;
        if (lastBlackSyncKey === syncKey) return;

        let meta: Record<string, any> | null = null;
        try {
          const [{ getDoc, doc }, { db }] = await Promise.all([
            import("firebase/firestore"),
            import("./firebase"),
          ]);
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            meta = serializeFirestoreData(snap.data());
          }
        } catch (err) {
          console.error("Errore lettura profilo Firestore:", err);
        }

        await fetch("/api/black/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            email: user.email,
            fullName: user.displayName || meta?.full_name || null,
            sessionId,
            meta,
          }),
          keepalive: true,
        });
        setLastBlackSyncKey(syncKey);
      } catch (err) {
        console.error("Errore sync profilo Black:", err);
      }
    });
  }, [user?.uid, user?.email, user?.displayName, isSubscribed, lastBlackSyncKey]);

  /* ---------- Calcolo stato abbonamento (con cache/override) ---------- */
const computeSubscription = async (emailNullable: string | null) => {
    try {
      if (!emailNullable) {
        setIsSubscribed(false);
        setSubscriptionInfo(null);
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

      // Pulizia cache stale: se l'email originale è diversa da quella normalizzata,
      // rimuovi eventuali cache per l'email originale per evitare conflitti
      if (emailNullable !== email) {
        const originalKey = subKey(emailNullable);
        sessionStorage.removeItem(originalKey);
      }

      // Check temp access prima degli override permanenti
      const tempAccessInfo = getTempAccessInfo(email);
      if (tempAccessInfo) {
        const subscriptionInfo: SubscriptionInfo = {
          isSubscribed: true,
          source: "temp_access",
          tempAccessInfo: {
            expiresAt: tempAccessInfo.expiresAt,
            reason: tempAccessInfo.reason,
            grantedAt: tempAccessInfo.grantedAt,
          },
        };
        setIsSubscribed(true);
        setSubscriptionInfo(subscriptionInfo);
        sessionStorage.setItem(
          key,
          JSON.stringify({
            v: true,
            t: Date.now(),
            src: "temp_access",
            tempInfo: tempAccessInfo,
          })
        );
        return;
      }

      // Override permanenti (env vars)
      if (ALL_OVERRIDES.has(email)) {
        const subscriptionInfo: SubscriptionInfo = {
          isSubscribed: true,
          source: "override",
        };
        setIsSubscribed(true);
        setSubscriptionInfo(subscriptionInfo);
        sessionStorage.setItem(
          key,
          JSON.stringify({ v: true, t: Date.now(), src: "override" })
        );
        return;
      }

      // Cache valida - ma con logica migliorata per nuovi abbonamenti
      const cachedRaw = sessionStorage.getItem(key);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as {
            v: boolean;
            t: number;
            src?: string;
            tempInfo?: any;
          };

          const cacheAge = Date.now() - cached.t;

          // Cache per abbonamenti attivi: 10 minuti
          // Cache per non-abbonamenti: solo 2 minuti (per rilevare nuovi abbonamenti più velocemente)
          const maxCacheTime = cached.v ? 10 * 60 * 1000 : 2 * 60 * 1000;

          if (cacheAge < maxCacheTime) {
            setIsSubscribed(cached.v);

            // Ricostruisci subscriptionInfo dalla cache
            if (cached.v) {
              const subscriptionInfo: SubscriptionInfo = {
                isSubscribed: true,
                source: (cached.src as any) || "stripe",
                ...(cached.tempInfo &&
                  cached.src === "temp_access" && {
                    tempAccessInfo: {
                      expiresAt: cached.tempInfo.expiresAt,
                      reason: cached.tempInfo.reason,
                      grantedAt: cached.tempInfo.grantedAt,
                    },
                  }),
              };
              setSubscriptionInfo(subscriptionInfo);
            } else {
              setSubscriptionInfo({ isSubscribed: false, source: "stripe" });
            }
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
        setSubscriptionInfo({ isSubscribed: false, source: "stripe" });
        return;
      }

      const data = await resp.json();
      const v = !!data.isSubscribed;
      setIsSubscribed(v);
      setSubscriptionInfo({ isSubscribed: v, source: "stripe" });
      sessionStorage.setItem(
        key,
        JSON.stringify({ v, t: Date.now(), src: "stripe" })
      );
    } catch (err) {
      console.error("Stripe status fetch error", err);
      setIsSubscribed(false);
      setSubscriptionInfo({ isSubscribed: false, source: "stripe" });
    }
  };

  /* ---------- Refresh manuale (pannello utente) ---------- */
  const forceRefreshSubscription = async () => {
    try {
      const email = user?.email?.toLowerCase();
      if (!email) return;

      // Rimuovi la cache per l'email normalizzata
      sessionStorage.removeItem(subKey(email));

      // Rimuovi anche possibili cache per varianti dell'email con case diverso
      // Questo risolve problemi dove l'utente potrebbe aver fatto login in passato
      // con case diverso e avere cache stale
      const originalEmail = user?.email;
      if (originalEmail && originalEmail !== email) {
        sessionStorage.removeItem(subKey(originalEmail.toLowerCase()));
      }

      await computeSubscription(email);
    } catch {
      // no-op
    }
  };

  /* ---------- Check new subscription (dopo acquisti) ---------- */
  const checkNewSubscription = useCallback(async () => {
    try {
      const email = user?.email?.toLowerCase();
      if (!email) return;

      // Invalida sempre la cache per forzare una verifica fresca
      sessionStorage.removeItem(subKey(email));

      // Rimuovi anche cache per varianti dell'email
      const originalEmail = user?.email;
      if (originalEmail && originalEmail !== email) {
        sessionStorage.removeItem(subKey(originalEmail.toLowerCase()));
      }

      // Forza un controllo immediato su Stripe (salta temp access e override)
      await computeSubscription(email);
    } catch (err) {
      console.error("Error checking new subscription:", err);
    }
  }, [user?.email]);

  // Rilevamento ritorno sulla pagina - per ricontrollare abbonamenti dopo acquisti su Stripe
  useEffect(() => {
    let lastVisibilityTime = Date.now();
    let wasHidden = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pagina nascosta - l'utente potrebbe essere andato su Stripe
        wasHidden = true;
        lastVisibilityTime = Date.now();
      } else if (wasHidden && user?.email) {
        // Pagina di nuovo visibile dopo essere stata nascosta
        const now = Date.now();
        const hiddenDuration = now - lastVisibilityTime;

        // Controlla se l'utente ha fatto un tentativo di acquisto di recente
        const lastPurchaseAttempt = sessionStorage.getItem(
          "last_purchase_attempt"
        );
        const recentPurchaseAttempt =
          lastPurchaseAttempt &&
          now - parseInt(lastPurchaseAttempt) < 10 * 60 * 1000; // negli ultimi 10 minuti

        // Se è stata nascosta per più di 10 secondi, probabilmente è tornato da Stripe
        if (hiddenDuration > 10 * 1000) {
          console.log(
            `Page was hidden for ${Math.round(hiddenDuration / 1000)}s, checking for new subscription...`
          );

          // Se attualmente NON ha un abbonamento, ricontrolla sempre
          if (!isSubscribed) {
            const email = user.email.toLowerCase();
            sessionStorage.removeItem(subKey(email));
            computeSubscription(email);
          }
          // Se ha tentato un acquisto di recente, ricontrolla anche se ha già un abbonamento
          // (potrebbe essere un upgrade/downgrade)
          else if (recentPurchaseAttempt) {
            console.log(
              "Recent purchase attempt detected, rechecking subscription..."
            );
            checkNewSubscription();
          }
          // Anche se ha già un abbonamento, dopo 60+ secondi ricontrolla (per upgrade/downgrade)
          else if (hiddenDuration > 60 * 1000) {
            checkNewSubscription();
          }
        }
        wasHidden = false;
      }
    };

    // Controlla anche al focus della finestra (per sicurezza)
    const handleFocus = () => {
      if (wasHidden && user?.email && !isSubscribed) {
        console.log(
          "Window focused after being away, checking subscription..."
        );
        checkNewSubscription();
        wasHidden = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user?.email, isSubscribed, checkNewSubscription]);

  // Listener per eventi di storage - in caso di comunicazione cross-tab
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Se viene settato un flag di nuovo acquisto, ricontrolla l'abbonamento
      if (
        e.key === "new_purchase_completed" &&
        e.newValue === "true" &&
        user?.email
      ) {
        sessionStorage.removeItem("new_purchase_completed");
        checkNewSubscription();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user?.email, checkNewSubscription]);

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
    setSubscriptionInfo(null);
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
        subscriptionInfo,
        savedLessons,
        refreshSavedLessons,
        forceRefreshSubscription,
        checkNewSubscription,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function serializeFirestoreData(value: any): any {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((entry) => serializeFirestoreData(entry));
  if (typeof value === "object") {
    if (typeof (value as any).toDate === "function") {
      try {
        return (value as any).toDate().toISOString();
      } catch {
        return null;
      }
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeFirestoreData(entry)])
    );
  }
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  return null;
}

/* =========================
   Hook
========================= */
export function useAuth() {
  return useContext(AuthContext);
}
