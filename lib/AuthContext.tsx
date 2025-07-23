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
import { auth } from "./firebase";
import { useRouter } from "next/navigation";

type AppUser = {
  uid: string;
  email: string;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  isSubscribed: boolean | null;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isSubscribed: null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          const appUser: AppUser = {
            uid: fbUser.uid,
            email: fbUser.email!,
          };
          setUser(appUser);

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
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, isSubscribed, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
