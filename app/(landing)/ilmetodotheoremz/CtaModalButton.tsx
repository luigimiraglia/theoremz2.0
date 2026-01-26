"use client";

import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type CtaModalButtonProps = {
  className?: string;
  children: ReactNode;
};

const PHONE_PREFIXES = [
  { value: "+39", label: "\u{1F1EE}\u{1F1F9}", title: "Italia +39" },
  { value: "+41", label: "\u{1F1E8}\u{1F1ED}", title: "Svizzera +41" },
  { value: "+43", label: "\u{1F1E6}\u{1F1F9}", title: "Austria +43" },
  { value: "+33", label: "\u{1F1EB}\u{1F1F7}", title: "Francia +33" },
  { value: "+49", label: "\u{1F1E9}\u{1F1EA}", title: "Germania +49" },
  { value: "+34", label: "\u{1F1EA}\u{1F1F8}", title: "Spagna +34" },
  { value: "+44", label: "\u{1F1EC}\u{1F1E7}", title: "Regno Unito +44" },
  { value: "+1", label: "\u{1F1FA}\u{1F1F8}", title: "Stati Uniti +1" },
];

export default function CtaModalButton({
  className,
  children,
}: CtaModalButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const modalId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setErrorMessage(null);
    }
  }, [open]);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "loading") return;

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const formData = new FormData(form);
    const payload = {
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      phonePrefix: String(formData.get("phonePrefix") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
    };

    try {
      setStatus("loading");
      setErrorMessage(null);
      const response = await fetch("/api/ilmetodotheoremz/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setStatus("error");
        setErrorMessage(
          data?.error ? String(data.error) : "Errore durante l'invio.",
        );
        return;
      }

      form.reset();
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage("Errore durante l'invio.");
    }
  };

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
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center px-2 py-8 sm:px-6"
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
                className="relative z-10 w-full max-w-[94vw] rounded-3xl bg-white px-7 pb-6 pt-6 text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.35)] sm:max-w-md sm:p-8"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between">
                  <div className="w-full text-center">
                    <h3 className="mt-2 mb-3 text-2xl font-black sm:text-3xl">
                      Candidati Gratuitamente al{" "}
                      <span className="font-extrabold text-[#336DFD]">
                        METODO THEOREMZ
                      </span>
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute -right-3 -top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:border-slate-300 hover:text-slate-800"
                  aria-label="Chiudi"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
                <form className="mt-6 space-y-4 px-2" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <input
                        type="text"
                        name="firstName"
                        required
                        autoComplete="given-name"
                        aria-label="Nome"
                        placeholder="Nome*"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#336DFD] focus:ring-2 focus:ring-[#336DFD]/20"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="lastName"
                        required
                        autoComplete="family-name"
                        aria-label="Cognome"
                        placeholder="Cognome*"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#336DFD] focus:ring-2 focus:ring-[#336DFD]/20"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="grid grid-cols-[64px_1fr] gap-3">
                  <select
                    name="phonePrefix"
                    defaultValue="+39"
                    autoComplete="off"
                    required
                    className="w-full rounded-xl border border-slate-200 px-0 py-3 text-lg text-slate-900 outline-none transition focus:border-[#336DFD] focus:ring-2 focus:ring-[#336DFD]/20 text-center"
                    aria-label="Prefisso"
                  >
                        {PHONE_PREFIXES.map((prefix) => (
                          <option
                            key={prefix.value}
                            value={prefix.value}
                            title={prefix.title}
                          >
                            {prefix.label}
                          </option>
                        ))}
                      </select>
                  <input
                    type="tel"
                    name="phone"
                    required
                    autoComplete="tel-national"
                    inputMode="numeric"
                    pattern="[0-9]{6,15}"
                    aria-label="Telefono"
                    placeholder="Telefono*"
                    title="Inserisci solo numeri (6-15 cifre)"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#336DFD] focus:ring-2 focus:ring-[#336DFD]/20"
                  />
                </div>
              </div>
              <div>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  pattern="[^@\\s]+@[^@\\s]+\\.[^@\\s]+"
                  aria-label="Email"
                  placeholder="Email*"
                  title="Inserisci un'email valida"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#336DFD] focus:ring-2 focus:ring-[#336DFD]/20"
                />
              </div>
              <label className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                <span className="relative flex h-5 w-5 flex-none items-center justify-center">
                  <input
                    type="checkbox"
                    name="privacy"
                    required
                    className="peer absolute h-5 w-5 opacity-0"
                  />
                  <span className="h-5 w-5 rounded border border-slate-300 bg-white transition peer-checked:border-[#336DFD] peer-checked:bg-[#336DFD]/10 peer-focus-visible:ring-2 peer-focus-visible:ring-[#336DFD]/30" />
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="absolute h-3.5 w-3.5 text-[#336DFD] opacity-0 transition peer-checked:opacity-100"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="leading-relaxed relative top-[2px] -ml-0.5">
                  Ho letto e accetto la{" "}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#336DFD] underline underline-offset-2"
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
              <button
                type="submit"
                disabled={status === "loading"}
                className="mt-2 w-full rounded-2xl bg-[#336DFD] px-6 py-3 text-center text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                    {status === "loading"
                      ? "Invio in corso..."
                      : status === "success"
                        ? "Inviato"
                        : "INVIA RICHIESTA"}
                  </button>
                  {status === "error" ? (
                    <p
                      className="text-sm font-semibold text-red-500"
                      role="status"
                    >
                      {errorMessage || "Errore durante l'invio."}
                    </p>
                  ) : null}
                  {status === "success" ? (
                    <p
                      className="text-sm font-semibold text-emerald-600"
                      role="status"
                    >
                      Richiesta inviata. Ti ricontattiamo a breve.
                    </p>
                  ) : null}
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
