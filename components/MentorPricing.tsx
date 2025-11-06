"use client";

import { useState } from "react";
import BuyLink from "./BuyLink";

type BillingMode = "monthly" | "weekly";

type PlanPricing = {
  amount: string;
  cadence: string;
  subLabel: string;
  tag: string;
  stripeLink: string;
  planLabel: string;
};

const basePlanPricing: Record<BillingMode, PlanPricing> = {
  monthly: {
    amount: "26€",
    cadence: "/settimana",
    subLabel: "Pagati mensilmente",
    tag: "Risparmi il 10%",
    stripeLink: "https://buy.stripe.com/dRmaEX44k6In5ZvfdQc7u0U",
    planLabel: "Piano Base • Mensile",
  },
  weekly: {
    amount: "29€",
    cadence: "/settimana",
    subLabel: "Pagamento settimanale senza vincoli",
    tag: "Più flessibile",
    stripeLink: "https://buy.stripe.com/8x23cv0S83wb0Fb3v8c7u0V",
    planLabel: "Piano Base • Settimanale",
  },
};

const basePlanBullets = [
  "Tutor dedicato per lo studente",
  "Aiuto compiti via chat giornaliero",
  "1h di lezione a settimana",
  "Esercizi personalizzati di rinforzo",
  "Accesso a tutte le risorse di Theoremz",
  "Orari flessibili anche il weekend",
  "Report per i genitori",
  "Piano di studio personalizzato",
  "100% soddisfatti o rimborsati",
];

type ToggleablePlan = {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  waLink: string;
  pricingModes: Record<BillingMode, PlanPricing>;
  defaultMode?: BillingMode;
};

const extraPlans: ToggleablePlan[] = [
  {
    id: "accelerato",
    title: "Piano Accelerato",
    description: "2 ore di lezione a settimana + supporto quotidiano",
    bullets: [
      "Tutor dedicato per lo studente",
      "Aiuto compiti via chat giornaliero",
      "2h di lezione a settimana",
      "Esercizi personalizzati di rinforzo",
      "Accesso completo alle risorse di Theoremz",
      "Report periodici per i genitori",
      "Piano di studio ricalibrato dopo ogni verifica",
    ],
    waLink: "https://wa.link/1nnh4k",
    pricingModes: {
      monthly: {
        amount: "46€",
        cadence: "/settimana",
        subLabel: "Pagati mensilmente",
        tag: "Risparmi il 10%",
        stripeLink: "https://buy.stripe.com/bJe4gz8kA4AfgE9aXAc7u0W",
        planLabel: "Piano Accelerato • Mensile",
      },
      weekly: {
        amount: "49€",
        cadence: "/settimana",
        subLabel: "Pagamento settimanale senza vincoli",
        tag: "Più flessibile",
        stripeLink: "https://buy.stripe.com/aFacN56cs8Qv2Nje9Mc7u0X",
        planLabel: "Piano Accelerato • Settimanale",
      },
    },
  },
];

export default function MentorPricing() {
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const safeBillingMode = basePlanPricing[billingMode]
    ? billingMode
    : "monthly";
  const currentBasePricing = basePlanPricing[safeBillingMode];

  return (
    <div className="space-y-8">
      <header className="space-y-4 text-white">
        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
          Scegli il tuo ritmo
        </span>
        <div className="flex flex-col gap-3">
          <h2 className="text-[32px] font-black leading-tight sm:text-[36px]">
            Prezzi chiari, risultati concreti
          </h2>
          <p className="max-w-2xl text-[15.5px] text-white/70">
            Personalizza il Piano Base in base a come preferisci pagare. Puoi
            sempre parlare con noi prima di attivare l&apos;abbonamento.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Base plan */}
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-6 text-white backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
              Piano Base
            </span>
            <span className="rounded-full border border-emerald-300/60 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
              {currentBasePricing.tag}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-2 text-white">
            <span className="text-[46px] font-black leading-none">
              {currentBasePricing.amount}
            </span>
            <span className="text-xl font-semibold">
              {currentBasePricing.cadence}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-white/70">
            {currentBasePricing.subLabel}
          </p>

          <div
            className="mt-5 inline-flex items-center gap-2 text-sm text-white/70"
            role="group"
            aria-label="Seleziona la fatturazione"
          >
            <span className="font-semibold text-white/60">Fatturazione</span>
            <div className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 p-0.5">
              <button
                type="button"
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  billingMode === "monthly"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "hover:bg-white/10",
                ].join(" ")}
                aria-pressed={safeBillingMode === "monthly"}
                onClick={() => setBillingMode("monthly")}
              >
                Mensile
              </button>
              <button
                type="button"
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  billingMode === "weekly"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "hover:bg-white/10",
                ].join(" ")}
                aria-pressed={safeBillingMode === "weekly"}
                onClick={() => setBillingMode("weekly")}
              >
                Settimanale
              </button>
            </div>
          </div>

          <div className="mt-5 h-px w-full bg-white/10" />

          <ul className="mt-5 space-y-3 text-[15px] text-white/80">
            {basePlanBullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <span className="mt-[2px] text-emerald-300">✓</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <BuyLink
            href={currentBasePricing.stripeLink}
            plan={currentBasePricing.planLabel}
            className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-[16px] font-extrabold text-white transition hover:from-sky-400 hover:to-cyan-400"
          >
            Voglio iniziare subito 🚀
          </BuyLink>
          <a
            href="https://wa.link/yofiy8"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white/80 transition hover:bg-white/10"
          >
            Chiedi informazioni 💬
          </a>
        </div>

        {/* Extra plans */}
        {extraPlans.map((plan) => (
          <ToggleExtraPlan key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}

function ToggleExtraPlan({ plan }: { plan: ToggleablePlan }) {
  const [mode, setMode] = useState<BillingMode>("monthly");
  const safeMode = plan.pricingModes[mode] ? mode : "monthly";
  const pricing = plan.pricingModes[safeMode];

  return (
    <div className="rounded-3xl border border-white/12 bg-white/10 p-6 text-white backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
          {plan.title}
        </span>
        <span className="rounded-full border border-emerald-300/60 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
          {pricing.tag}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <span className="text-[46px] font-black leading-none">
          {pricing.amount}
        </span>
        <span className="text-lg font-semibold text-white/70">
          {pricing.cadence}
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold text-white/70">
        {pricing.subLabel}
      </p>

      <div
        className="mt-4 inline-flex items-center gap-2 text-sm text-white/70"
        role="group"
        aria-label={`Seleziona la fatturazione per ${plan.title}`}
      >
        <span className="font-semibold text-white/60">Fatturazione</span>
        <div className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 p-0.5">
          <button
            type="button"
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              safeMode === "monthly"
                ? "bg-white text-slate-900 shadow-sm"
                : "hover:bg-white/10",
            ].join(" ")}
            aria-pressed={safeMode === "monthly"}
            onClick={() => setMode("monthly")}
          >
            Mensile
          </button>
          <button
            type="button"
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              safeMode === "weekly"
                ? "bg-white text-slate-900 shadow-sm"
                : "hover:bg-white/10",
            ].join(" ")}
            aria-pressed={safeMode === "weekly"}
            onClick={() => setMode("weekly")}
          >
            Settimanale
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold text-white/70">
        {plan.description}
      </p>

      <div className="mt-4 h-px w-full bg-white/10" />

      <ul className="mt-4 space-y-3 text-[15px] text-white/80">
        {plan.bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <span className="mt-[2px] text-sky-300">✓</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <BuyLink
        href={pricing.stripeLink}
        plan={pricing.planLabel}
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-[16px] font-extrabold text-white transition hover:from-sky-400 hover:to-cyan-400"
      >
        Voglio iniziare subito 🚀
      </BuyLink>
      <a
        href={plan.waLink}
        className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white/80 transition hover:bg-white/10"
      >
        Chiedi informazioni 💬
      </a>
    </div>
  );
}
