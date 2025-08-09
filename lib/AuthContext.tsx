// lib/AuthContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, db } from "./firebase";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

export type AppUser = {
  uid: string;
  email: string | null;
  displayName?: string | null;
  username?: string | null; // preso da Firestore se presente
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
  loading: true,
  isSubscribed: null,
  savedLessons: [],
  refreshSavedLessons: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [savedLessons, setSavedLessons] = useState<string[]>([]);
  const router = useRouter();

  // 🔄 Carica lezioni salvate da Firestore
  const refreshSavedLessons = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setSavedLessons(userDoc.data().savedLessons || []);
      } else {
        setSavedLessons([]);
      }
    } catch (err) {
      console.error("Errore caricamento lezioni salvate:", err);
      setSavedLessons([]);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          const userRef = doc(db, "users", fbUser.uid);
          let username: string | null = null;

          // recupera username da Firestore
          try {
            const snap = await getDoc(userRef);
            if (snap.exists()) {
              username = snap.data().username || null;
              setSavedLessons(snap.data().savedLessons || []);
            }
          } catch (err) {
            console.error("Errore recupero username/savedLessons", err);
          }

          const appUser: AppUser = {
            uid: fbUser.uid,
            email: fbUser.email ?? null,
            displayName: fbUser.displayName ?? null,
            username,
            createdAt: fbUser.metadata?.creationTime
              ? Date.parse(fbUser.metadata.creationTime)
              : undefined,
          };

          setUser(appUser);

          // stato abbonamento
          try {
            const resp = await fetch(
              "/api/stripe/subscription-status-by-email",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: appUser.email }),
              }
            );
            const data = await resp.json();
            setIsSubscribed(!!data.isSubscribed);
          } catch (err) {
            console.error("Stripe status fetch error", err);
            setIsSubscribed(false);
          }
        } else {
          setUser(null);
          setIsSubscribed(false);
          setSavedLessons([]);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIsSubscribed(false);
    setSavedLessons([]);
    router.push("/");
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
