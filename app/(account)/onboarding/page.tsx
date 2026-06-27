"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Phone,
  Target,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const TOTAL_STEPS = 4;

const TRACKS = [
  { code: "scientifico", label: "Scientifico" },
  { code: "scienze_applicate", label: "Scienze applicate" },
  { code: "classico", label: "Classico" },
  { code: "linguistico", label: "Linguistico" },
  { code: "tecnico", label: "Tecnico" },
] as const;

const TOPICS = {
  matematica: [
    { code: "equazioni_disequazioni", label: "Equazioni e disequazioni" },
    { code: "funzioni", label: "Funzioni" },
    { code: "geometria_analitica", label: "Geometria analitica" },
    { code: "trigonometria", label: "Trigonometria" },
    { code: "limiti", label: "Limiti" },
    { code: "derivate", label: "Derivate" },
    { code: "integrali", label: "Integrali" },
    { code: "probabilita_statistica", label: "Probabilita e statistica" },
    { code: "non_so_matematica", label: "Non so da dove iniziare" },
  ],
  fisica: [
    { code: "cinematica", label: "Cinematica" },
    { code: "dinamica", label: "Dinamica" },
    { code: "lavoro_energia", label: "Lavoro ed energia" },
    { code: "termodinamica", label: "Termodinamica" },
    { code: "onde", label: "Onde" },
    { code: "elettricita", label: "Elettricita" },
    { code: "magnetismo", label: "Magnetismo" },
    { code: "circuiti", label: "Circuiti" },
    { code: "non_so_fisica", label: "Non so da dove iniziare" },
  ],
} as const;

const NEEDS = [
  { code: "theory", label: "Non capisco la teoria" },
  { code: "exercises", label: "Mi blocco negli esercizi" },
  { code: "test", label: "Ho una verifica vicina" },
  { code: "method", label: "Mi manca un metodo" },
] as const;

const URGENCIES = [
  { code: "today", label: "Oggi o domani" },
  { code: "week", label: "Questa settimana" },
  { code: "test_date", label: "Prima della verifica" },
  { code: "not_urgent", label: "Non urgente" },
] as const;

type Cycle = "medie" | "liceo";
type SubjectCode = keyof typeof TOPICS;

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const returnTo = useMemo(
    () => sanitizeLocalRedirect(searchParams?.get("redirect"), "/"),
    [searchParams],
  );

  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState<Cycle>("liceo");
  const [year, setYear] = useState(1);
  const [trackCode, setTrackCode] = useState("scientifico");
  const [subjectCode, setSubjectCode] = useState<SubjectCode>("matematica");
  const [topicCode, setTopicCode] = useState<string>(TOPICS.matematica[0].code);
  const [needCode, setNeedCode] = useState("exercises");
  const [urgencyCode, setUrgencyCode] = useState("week");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/register?redirect=${encodeURIComponent(returnTo)}`);
    }
  }, [loading, user, router, returnTo]);

  useEffect(() => {
    setYear(1);
    if (cycle === "medie") {
      setTrackCode("medie");
      return;
    }
    setTrackCode((current) => (current === "medie" ? "scientifico" : current));
  }, [cycle]);

  useEffect(() => {
    setTopicCode(TOPICS[subjectCode][0].code);
  }, [subjectCode]);

  const years = cycle === "medie" ? [1, 2, 3] : [1, 2, 3, 4, 5];
  const selectedTrackLabel =
    cycle === "medie"
      ? "Medie"
      : TRACKS.find((track) => track.code === trackCode)?.label || "Scientifico";
  const selectedTopic =
    TOPICS[subjectCode].find((topic) => topic.code === topicCode) ||
    TOPICS[subjectCode][0];
  const selectedNeed = NEEDS.find((need) => need.code === needCode) || NEEDS[0];
  const selectedUrgency =
    URGENCIES.find((urgency) => urgency.code === urgencyCode) || URGENCIES[1];
  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const canContinue =
    step === 0
      ? Boolean(cycle && year && selectedTrackLabel)
      : step === 1
        ? Boolean(subjectCode && topicCode && needCode)
        : true;

  async function saveOnboarding() {
    if (saved) {
      setStep(3);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("missing_token");

      const res = await fetch("/api/me/onboarding", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cycle,
          year,
          indirizzo: selectedTrackLabel,
          schoolTrackCode: trackCode,
          subjectCode,
          topic: selectedTopic.label,
          topicCode,
          needCode,
          urgencyCode,
          phone,
          wantsTutorHelp: Boolean(phone.trim()),
          returnTo,
        }),
      });

      if (!res.ok) throw new Error("save_failed");
      setSaved(true);
      setStep(3);
    } catch {
      setError("Non riesco a salvare adesso. Riprova tra qualche secondo.");
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (!canContinue) return;
    if (step === 2) {
      void saveOnboarding();
      return;
    }
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-950 px-4 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </main>
    );
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-blue-600">
            Percorso personalizzato · {step + 1}/{TOTAL_STEPS}
          </p>
        </div>

        <div className="px-6 py-7 sm:px-8">
          {step === 0 && (
            <div className="space-y-6">
              <StepTitle
                icon={<GraduationCap className="h-5 w-5" />}
                title="Inquadriamo il tuo programma"
                subtitle="Questi dati servono per capire livello scolastico, percorso e contenuti da mostrarti prima."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  active={cycle === "liceo"}
                  title="Superiori"
                  description="Liceo o istituto tecnico"
                  onClick={() => setCycle("liceo")}
                />
                <ChoiceCard
                  active={cycle === "medie"}
                  title="Medie"
                  description="Prima, seconda o terza media"
                  onClick={() => setCycle("medie")}
                />
              </div>

              <div>
                <SectionLabel>Anno</SectionLabel>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {years.map((item) => (
                    <PillButton
                      key={item}
                      active={year === item}
                      onClick={() => setYear(item)}
                    >
                      {item}ª
                    </PillButton>
                  ))}
                </div>
              </div>

              {cycle === "liceo" && (
                <div>
                  <SectionLabel>Indirizzo</SectionLabel>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {TRACKS.map((track) => (
                      <PillButton
                        key={track.code}
                        active={trackCode === track.code}
                        onClick={() => setTrackCode(track.code)}
                      >
                        {track.label}
                      </PillButton>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <StepTitle
                icon={<Target className="h-5 w-5" />}
                title="Dove perdi piu punti?"
                subtitle="Teniamo solo matematica e fisica, cosi la segmentazione resta pulita e azionabile."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  active={subjectCode === "matematica"}
                  title="Matematica"
                  description="Algebra, funzioni, analisi, geometria"
                  onClick={() => setSubjectCode("matematica")}
                />
                <ChoiceCard
                  active={subjectCode === "fisica"}
                  title="Fisica"
                  description="Meccanica, onde, elettricita, circuiti"
                  onClick={() => setSubjectCode("fisica")}
                />
              </div>

              <div>
                <SectionLabel>Argomento principale</SectionLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TOPICS[subjectCode].map((topic) => (
                    <PillButton
                      key={topic.code}
                      active={topicCode === topic.code}
                      onClick={() => setTopicCode(topic.code)}
                    >
                      {topic.label}
                    </PillButton>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Tipo di difficolta</SectionLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {NEEDS.map((need) => (
                    <PillButton
                      key={need.code}
                      active={needCode === need.code}
                      onClick={() => setNeedCode(need.code)}
                    >
                      {need.label}
                    </PillButton>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <StepTitle
                icon={<Phone className="h-5 w-5" />}
                title="Vuoi un aiuto gratuito da un tutor?"
                subtitle="Se lasci il numero, il lead entra gia segmentato per priorita, materia e argomento."
              />

              <div>
                <SectionLabel>Quanto e urgente?</SectionLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {URGENCIES.map((urgency) => (
                    <PillButton
                      key={urgency.code}
                      active={urgencyCode === urgency.code}
                      onClick={() => setUrgencyCode(urgency.code)}
                    >
                      {urgency.label}
                    </PillButton>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Numero di telefono opzionale
                </span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+39 333 123 4567"
                  className="w-full rounded-[14px] border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="grid gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:grid-cols-3">
                <MiniSummary icon={<BookOpen className="h-4 w-4" />} label={selectedTopic.label} />
                <MiniSummary icon={<Target className="h-4 w-4" />} label={selectedNeed.label} />
                <MiniSummary icon={<Clock3 className="h-4 w-4" />} label={selectedUrgency.label} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Percorso personalizzato
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Abbiamo salvato livello, indirizzo, materia, argomento e
                  urgenza in modo strutturato. Ora puoi tornare allo studio o
                  completare meglio il tuo account.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => router.replace(returnTo)}
                  className="rounded-[14px] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Torna allo studio
                </button>
                <button
                  type="button"
                  onClick={() => router.replace("/account")}
                  className="rounded-[14px] bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Continua a personalizzare
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-5 rounded bg-red-100 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {step < 3 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0 || saving}
                className="inline-flex items-center gap-2 rounded-[14px] border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Indietro
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canContinue || saving}
                className="inline-flex items-center gap-2 rounded-[14px] bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Salvo..." : step === 2 ? "Completa" : "Avanti"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function StepTitle({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
        {icon}
      </div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p>
    </div>
  );
}

function ChoiceCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 text-left transition ${
        active
          ? "border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-100"
          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="block text-sm font-bold">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-slate-600">
        {description}
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-sm font-semibold text-slate-800">{children}</p>
  );
}

function PillButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[14px] border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function MiniSummary({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 font-semibold text-slate-800">
      <span className="text-blue-600">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function sanitizeLocalRedirect(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
