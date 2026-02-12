"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import BlackOnboardingScheduler, { BlackSchedulerVariant } from "./BlackOnboardingScheduler";

const DEFAULT_REDIRECT_PATH = "/black-onboarding-call";

type Props = {
  variant?: BlackSchedulerVariant;
  redirectPath?: string;
};

export default function BlackOnboardingGate({
  variant = "onboarding",
  redirectPath = DEFAULT_REDIRECT_PATH,
}: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const callLabel = variant === "check" ? "call di check percorso" : "call di onboarding";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setRedirecting(true);
      router.replace(`/register?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [loading, redirectPath, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm font-semibold text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
          Carico la pagina di prenotazione...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm font-semibold text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
          {redirecting ? "Reindirizzamento al login..." : `Accedi per prenotare la ${callLabel}.`}
        </div>
      </div>
    );
  }

  return <BlackOnboardingScheduler variant={variant} />;
}
