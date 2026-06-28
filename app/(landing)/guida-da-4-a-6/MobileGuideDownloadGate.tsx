"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

const PDF_URL = "/pdf/theoremz_guida_da_4_a_6.pdf";

export default function MobileGuideDownloadGate() {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canDownload = useMemo(() => {
    const cleanPhone = telefono.replace(/[^\d+]/g, "");
    return (
      nome.trim().length >= 2 &&
      cognome.trim().length >= 2 &&
      cleanPhone.length >= 8
    );
  }, [nome, cognome, telefono]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canDownload) return;
    setErr(null);
    setSending(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${nome.trim()} ${cognome.trim()}`.trim(),
          phone: telefono.trim(),
          source: "guida-da-4-a-6",
          note: "Richiesta download guida Da 4 a 6",
          contact: "call",
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Errore invio");
      }

      const link = document.createElement("a");
      link.href = PDF_URL;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      setErr(error?.message || "Non è stato possibile completare il download");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mobile-guide-gate">
      <div className="mobile-guide-intro">
        <p className="mobile-guide-eyebrow">Guida pratica</p>
        <h1>Da 4 a 6 in un mese</h1>
        <p>
          Un piano semplice per capire dove si rompe lo studio e recuperare
          matematica con più ordine.
        </p>
      </div>

      <div className="mobile-guide-form">
        <label className="mobile-field">
          <span>Nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Mario"
            autoComplete="given-name"
            className="mobile-input"
            type="text"
            name="nome"
          />
        </label>

        <label className="mobile-field">
          <span>Cognome</span>
          <input
            value={cognome}
            onChange={(e) => setCognome(e.target.value)}
            placeholder="Rossi"
            autoComplete="family-name"
            className="mobile-input"
            type="text"
            name="cognome"
          />
        </label>

        <label className="mobile-field">
          <span>Numero di telefono</span>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+39 347 123 4567"
            autoComplete="tel"
            className="mobile-input"
            type="tel"
            name="telefono"
          />
        </label>

        <button
          type="submit"
          disabled={!canDownload || sending}
          className={`mobile-download-button ${canDownload ? "mobile-download-button--ready" : ""}`}
        >
          {sending ? "Invio in corso…" : "Scarica PDF"}
        </button>
        {err ? <p className="mobile-guide-error">{err}</p> : null}
      </div>
    </form>
  );
}
