"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";

export default function LeadFormClient() {
  const sp = useSearchParams();
  const source = sp?.get("source") || sp?.get("ref") || "direct";

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [telefono, setTelefono] = useState("");
  const [orario, setOrario] = useState("qualsiasi");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    setErr(null);
    const name = `${nome.trim()} ${cognome.trim()}`.trim();
    if (!name || !telefono.trim()) {
      setErr("Nome, cognome e telefono sono obbligatori");
      return;
    }
    setSending(true);
    try {
      try {
        track("lead_submit_clicked", { source, slot: orario });
      } catch {}
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: telefono,
          slot: orario,
          note: note || null,
          source,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Errore invio");
      setOk("Richiesta inviata! Ti contatteremo entro poche ore.");
      try {
        track("lead_submitted", { source, slot: orario });
      } catch {}
      setNome("");
      setCognome("");
      setTelefono("");
      setOrario("qualsiasi");
      setNote("");
    } catch (e: any) {
      setErr(e?.message || "Errore invio");
    } finally {
      setSending(false);
    }
  }

  const Chip = ({ value, label }: { value: string; label: string }) => (
    <button
      type="button"
      onClick={() => setOrario(value)}
      className={`rounded-xl border-2 px-3 py-2 text-[13px] font-extrabold transition ${
        orario === value
          ? "border-sky-600 bg-sky-100 text-sky-800"
          : "border-slate-200 bg-white text-slate-700 [.dark_&]:bg-slate-900"
      }`}
      aria-pressed={orario === value}
    >
      {label}
    </button>
  );

  return (
    <form
      onSubmit={submit}
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white [.dark_&]:bg-slate-900 p-5 sm:p-7 shadow-[0_22px_60px_rgba(2,132,199,0.14)]"
    >
      {ok && (
        <div className="mb-3 rounded-xl bg-emerald-50 text-emerald-800 px-3 py-2 ring-1 ring-emerald-200">
          {ok}
        </div>
      )}
      {err && (
        <div className="mb-3 rounded-xl bg-rose-50 text-rose-700 px-3 py-2 ring-1 ring-rose-200">
          {err}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">
            Nome *
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-2xl border-2 border-slate-200 bg-white [.dark_&]:bg-slate-900 px-3 py-2.5 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="Es. Giulia"
            required
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">
            Cognome *
          </label>
          <input
            type="text"
            value={cognome}
            onChange={(e) => setCognome(e.target.value)}
            className="mt-1 w-full rounded-2xl border-2 border-slate-200 bg-white [.dark_&]:bg-slate-900 px-3 py-2.5 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="Es. Rossi"
            required
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">
          Telefono *
        </label>
        <div className="mt-1 flex rounded-2xl border-2 border-slate-200 bg-white [.dark_&]:bg-slate-900 focus-within:ring-2 focus-within:ring-sky-300">
          <span className="inline-flex items-center gap-1 pl-3 pr-2 text-[13px] font-black text-slate-500 select-none">
            +39
          </span>
          <input
            type="tel"
            inputMode="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full rounded-r-2xl bg-transparent px-2 py-2.5 text-[15px] font-semibold focus:outline-none"
            placeholder="Es. 347 123 4567"
            required
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">
          Orario preferito
        </label>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Chip value="qualsiasi" label="Qualsiasi" />
          <Chip value="mattina" label="Mattina" />
          <Chip value="pomeriggio" label="Pomeriggio" />
          <Chip value="sera" label="Sera" />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">
          Note (facoltative)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Es. preferisco lunedì/mercoledì dalle 15 alle 18"
          className="mt-1 w-full rounded-2xl border-2 border-slate-200 bg-white [.dark_&]:bg-slate-900 px-3 py-2.5 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
      </div>

      <div className="mt-0 flex justify-center">
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 px-8 py-3.5 font-black text-white transition-colors disabled:opacity-60"
        >
          {sending ? "Invio…" : "Invia richiesta"}
        </button>
      </div>
    </form>
  );
}
