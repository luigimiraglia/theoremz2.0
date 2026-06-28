"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Phone,
  Search,
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
  const previewMode = searchParams?.get("preview") === "1";
  const draftKey = useMemo(() => {
    if (previewMode) return "theoremz:onboarding-preview-draft";
    return user?.uid ? `theoremz:onboarding-draft:${user.uid}` : null;
  }, [previewMode, user?.uid]);
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
  const [topicQuery, setTopicQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draftReady, setDraftReady] = useState(previewMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewMode && !loading && !user) {
      router.replace(`/register?redirect=${encodeURIComponent(returnTo)}`);
    }
  }, [loading, user, router, returnTo, previewMode]);

  useEffect(() => {
    if (previewMode) {
      setDraftReady(true);
      return;
    }
    if (!draftKey || !user?.uid) return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Record<string, any>;
        if (Number.isFinite(Number(draft.step))) {
          setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, Number(draft.step))));
        }
        if (draft.cycle === "medie" || draft.cycle === "liceo") {
          setCycle(draft.cycle);
        }
        if (Number.isFinite(Number(draft.year))) {
          setYear(Math.max(1, Math.min(5, Math.trunc(Number(draft.year)))));
        }
        if (typeof draft.trackCode === "string") {
          setTrackCode(draft.trackCode);
        }
        if (
          draft.subjectCode === "matematica" ||
          draft.subjectCode === "fisica"
        ) {
          setSubjectCode(draft.subjectCode);
        }
        if (typeof draft.topicCode === "string") {
          setTopicCode(draft.topicCode);
        }
        if (typeof draft.needCode === "string") {
          setNeedCode(draft.needCode);
        }
        if (typeof draft.urgencyCode === "string") {
          setUrgencyCode(draft.urgencyCode);
        }
        if (typeof draft.phone === "string") {
          setPhone(draft.phone);
        }
      }
    } catch (error) {
      console.warn("[onboarding] draft restore failed", error);
    } finally {
      setDraftReady(true);
    }
  }, [draftKey, previewMode, user?.uid]);

  useEffect(() => {
    if (!draftReady || previewMode || !draftKey || !user?.uid || saved) return;
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          step,
          cycle,
          year,
          trackCode,
          subjectCode,
          topicCode,
          needCode,
          urgencyCode,
          phone,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.warn("[onboarding] draft save failed", error);
    }
  }, [
    draftKey,
    draftReady,
    phone,
    previewMode,
    saved,
    step,
    subjectCode,
    topicCode,
    trackCode,
    urgencyCode,
    user?.uid,
    year,
    cycle,
    needCode,
  ]);

  const years = cycle === "medie" ? [1, 2, 3] : [1, 2, 3, 4, 5];
  const selectedTrackLabel =
    cycle === "medie"
      ? "Medie"
      : TRACKS.find((track) => track.code === trackCode)?.label ||
        "Scientifico";
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

    if (previewMode) {
      setSaved(true);
      setStep(3);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token =
        (await user?.getIdToken?.()) ||
        (await getAuth().currentUser?.getIdToken());
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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("[onboarding] save failed", data);
        throw new Error(data?.error || "save_failed");
      }
      setSaved(true);
      if (draftKey) {
        try {
          window.localStorage.removeItem(draftKey);
        } catch {}
      }
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

  function selectCycle(next: Cycle) {
    setCycle(next);
    setYear(1);
    if (next === "medie") {
      setTrackCode("medie");
      return;
    }
    setTrackCode((current) => (current === "medie" ? "scientifico" : current));
  }

  function selectSubject(next: SubjectCode) {
    setSubjectCode(next);
    setTopicCode(TOPICS[next][0].code);
    setTopicQuery("");
  }

  if (!previewMode && (loading || !user || !draftReady)) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-950 px-4 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-start justify-center bg-slate-950 px-0 py-0 sm:min-h-[70vh] sm:items-center sm:px-4 sm:py-10">
      <section className="flex w-full min-h-[100dvh] max-w-none flex-col overflow-hidden bg-white sm:min-h-0 sm:max-w-2xl sm:rounded-[28px] sm:border sm:border-slate-200 sm:shadow-2xl">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur sm:static sm:px-8 sm:py-5">
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100 sm:mb-4">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 sm:text-sm sm:normal-case sm:tracking-normal">
            Percorso personalizzato · {step + 1}/{TOTAL_STEPS}
          </p>
        </div>

        <div className="flex-1 px-4 py-5 pb-6 sm:px-8 sm:py-7">
          {step === 0 && (
            <div className="space-y-5 sm:space-y-6">
              <StepTitle
                icon={<GraduationCap className="h-5 w-5" />}
                title="Partiamo da te"
                subtitle="Creiamo un percorso su misura."
              />

              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                <ChoiceCard
                  active={cycle === "liceo"}
                  title="Superiori"
                  icon={<GraduationCap className="h-5 w-5" />}
                  onClick={() => selectCycle("liceo")}
                />
                <ChoiceCard
                  active={cycle === "medie"}
                  title="Medie"
                  icon={<BookOpen className="h-5 w-5" />}
                  onClick={() => selectCycle("medie")}
                />
              </div>

              <div>
                <SectionLabel>Classe o anno</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 sm:gap-2">
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
                  <SectionLabel>Indirizzo di studio</SectionLabel>
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
            <div className="space-y-5 sm:space-y-6">
              <StepTitle
                icon={<Target className="h-5 w-5" />}
                title="Su cosa dobbiamo aiutarti per primo?"
                subtitle="Teniamo solo matematica e fisica, così partiamo subito dal punto che può sbloccare più risultati."
              />

              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                <ChoiceCard
                  active={subjectCode === "matematica"}
                  title="Matematica"
                  icon={<Atom className="h-5 w-5" />}
                  onClick={() => selectSubject("matematica")}
                />
                <ChoiceCard
                  active={subjectCode === "fisica"}
                  title="Fisica"
                  icon={<Clock3 className="h-5 w-5" />}
                  onClick={() => selectSubject("fisica")}
                />
              </div>

              <div>
                <SectionLabel>Cosa ti serve adesso</SectionLabel>
                <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
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

              <div>
                <SectionLabel>Argomento da sbloccare</SectionLabel>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={topicQuery}
                    onChange={(event) => {
                      const nextQuery = event.target.value;
                      setTopicQuery(nextQuery);
                      const normalized = nextQuery.trim().toLowerCase();
                      if (!normalized) return;
                      const exactMatch = TOPICS[subjectCode].find(
                        (topic) => topic.label.toLowerCase() === normalized,
                      );
                      if (exactMatch) {
                        setTopicCode(exactMatch.code);
                        return;
                      }
                      const onlyMatch =
                        TOPICS[subjectCode].filter((topic) =>
                          topic.label.toLowerCase().includes(normalized),
                        )[0] || null;
                      if (
                        onlyMatch &&
                        TOPICS[subjectCode].filter((topic) =>
                          topic.label.toLowerCase().includes(normalized),
                        ).length === 1
                      ) {
                        setTopicCode(onlyMatch.code);
                      }
                    }}
                    placeholder="Cerca un argomento"
                    list="onboarding-topics"
                    className="w-full rounded-[14px] border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <datalist id="onboarding-topics">
                    {TOPICS[subjectCode].map((topic) => (
                      <option key={topic.code} value={topic.label} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 sm:space-y-6">
              <StepTitle
                icon={<Phone className="h-5 w-5" />}
                title="Se ti va, ti affianchiamo anche con un tutor"
                subtitle="Il numero è opzionale. Se lo lasci, ti ricontattiamo solo quando può servirti davvero."
              />

              <div>
                <SectionLabel>Quanto ti serve aiuto?</SectionLabel>
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
                  Numero di telefono, solo se vuoi essere ricontattato
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

              <div className="hidden gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700 sm:grid sm:grid-cols-3 sm:px-4">
                <MiniSummary
                  icon={<BookOpen className="h-4 w-4" />}
                  label={selectedTopic.label}
                />
                <MiniSummary
                  icon={<Target className="h-4 w-4" />}
                  label={selectedNeed.label}
                />
                <MiniSummary
                  icon={<Clock3 className="h-4 w-4" />}
                  label={selectedUrgency.label}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 text-center sm:space-y-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 sm:h-14 sm:w-14">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Perfetto, il percorso è pronto
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Ora il tuo account sa da dove partire: livello, materia,
                  argomento e urgenza. Puoi tornare a studiare o rifinire i dati
                  più tardi.
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
                  Rifinisci il profilo
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700 sm:mt-5">
              {error}
            </p>
          )}

          {step < 3 && (
            <div className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:mt-8 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0 || saving}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-300 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline sm:pl-2">Indietro</span>
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canContinue || saving}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
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
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 sm:h-10 sm:w-10">
        {icon}
      </div>
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
      <p className="mt-2 hidden text-sm leading-relaxed text-slate-600 sm:block sm:text-base">
        {subtitle}
      </p>
    </div>
  );
}

function ChoiceCard({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description?: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-14 rounded-2xl border px-3 py-2.5 text-left transition sm:min-h-20 sm:px-4 sm:py-4 ${
        active
          ? "border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-100"
          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
            active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-tight">{title}</span>
          {description ? (
            <span className="mt-1 block text-xs leading-relaxed text-slate-600">
              {description}
            </span>
          ) : null}
        </div>
        {active ? (
          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
        ) : null}
      </div>
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
      className={`min-h-9 rounded-[14px] border px-2.5 py-1.5 text-xs font-semibold leading-tight transition sm:min-h-11 sm:px-3 sm:py-2 sm:text-sm ${
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
    <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-800">
      <span className="text-blue-600">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function sanitizeLocalRedirect(
  value: string | null | undefined,
  fallback: string,
) {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return fallback;
  return value;
}
