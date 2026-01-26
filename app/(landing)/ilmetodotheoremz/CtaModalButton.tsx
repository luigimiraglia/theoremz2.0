"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

type CtaModalButtonProps = {
  className?: string;
  children: ReactNode;
};

const PHONE_PREFIXES = [
  { value: "+39", label: "+39 IT" },
  { value: "+41", label: "+41 CH" },
  { value: "+43", label: "+43 AT" },
  { value: "+33", label: "+33 FR" },
  { value: "+49", label: "+49 DE" },
  { value: "+34", label: "+34 ES" },
  { value: "+44", label: "+44 UK" },
  { value: "+1", label: "+1 US" },
];

export default function CtaModalButton({
  className,
  children,
}: CtaModalButtonProps) {
  const [open, setOpen] = useState(false);
  const modalId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={modalId}
      >
        {children}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 sm:px-6"
          role="dialog"
          aria-modal="true"
          id={modalId}
        >
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.35)] sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Candidatura
                </p>
                <h3 className="mt-2 text-2xl font-black sm:text-3xl">
                  Candidati ora
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Compila i dati e ti ricontattiamo al pi&ugrave; presto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                aria-label="Chiudi"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Nome
                  <input
                    type="text"
                    name="firstName"
                    required
                    autoComplete="given-name"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-[#336DFD] focus:ring-2 focus:ring-[#336DFD]/20"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Cognome
                  <input
                    type="text"
                    name="lastName"
                    required
                    autoComplete="family-name"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-[#336DFD] focus:ring-2 focus:ring-[#336DFD]/20"
                  />
                </label>
              </div>
              <label className="text-sm font-semibold text-slate-700">
                Email
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-[#336DFD] focus:ring-2 focus:ring-[#336DFD]/20"
                />
              </label>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Telefono
                </label>
                <div className="mt-2 grid grid-cols-[120px_1fr] gap-3">
                  <select
                    name="phonePrefix"
                    defaultValue="+39"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-[#336DFD] focus:ring-2 focus:ring-[#336DFD]/20"
                    aria-label="Prefisso"
                  >
                    {PHONE_PREFIXES.map((prefix) => (
                      <option key={prefix.value} value={prefix.value}>
                        {prefix.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="phone"
                    required
                    autoComplete="tel"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-[#336DFD] focus:ring-2 focus:ring-[#336DFD]/20"
                    placeholder="Numero di telefono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-2xl bg-[#336DFD] px-6 py-3 text-center text-base font-bold text-white"
              >
                Candidati ora
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
