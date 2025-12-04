"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import BlackOnboardingScheduler from "./BlackOnboardingScheduler";

const REDIRECT_PATH = "/black-onboarding-call";

export default function BlackOnboardingGate() {
  const { user, isSubscribed, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setRedirecting(true);
      router.replace(`/register?redirect=${encodeURIComponent(REDIRECT_PATH)}`);
    }
  }, [loading, user, router]);

  if (loading || isSubscribed === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm font-semibold text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
          Carico lo stato del tuo abbonamento...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm font-semibold text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
          {redirecting ? "Reindirizzamento al login..." : "Accedi per prenotare la call di onboarding."}
        </div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-slate-900 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-50">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200">
              <ShieldOff className="h-5 w-5" aria-hidden />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold">Non hai accesso a questa pagina</p>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-100">
                La prenotazione onboarding è riservata agli abbonati Black.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/black"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Scopri Black
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/account"
                  className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-50 dark:border-amber-400/50 dark:bg-transparent dark:text-amber-100 dark:hover:bg-amber-400/10"
                >
                  Vai al mio account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <BlackOnboardingScheduler />;
}
