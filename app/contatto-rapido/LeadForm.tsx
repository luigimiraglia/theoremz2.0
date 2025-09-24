"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";
import { Phone, MessageCircle, CheckCircle2, Clock, ShieldCheck, Star } from "lucide-react";

export default function LeadForm() {
  const sp = useSearchParams();
  const source = sp?.get("source") || sp?.get("ref") || "direct";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [slot, setSlot] = useState("qualsiasi");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState<"call" | "whatsapp">("call");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState<null | string>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (!name.trim() || !phone.trim()) {
      setErr("Nome e telefono sono obbligatori");
      return;
    }
    setSending(true);
    try {
      try { track("lead_submit_clicked", { source, slot, contact }); } catch {}
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, slot, note: note || null, source, contact }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Errore invio");
      setOk("Grazie! Ti contatteremo entro poche ore.");
      try { track("lead_submitted", { source, slot, contact }); } catch {}
      setName(""); setPhone(""); setSlot("qualsiasi"); setNote(""); setContact("call");
    } catch (e: any) {
      setErr(e?.message || "Errore invio");
    } finally {
      setSending(false);
    }
  }

  const Chip = ({ value, label }: { value: string; label: string }) => (
    <button
      type="button"
      onClick={() => setSlot(value)}
      className={`rounded-xl border-2 px-3 py-2 text-[13px] font-extrabold transition ${
        slot === value
          ? "border-sky-500 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-white text-slate-700 [.dark_&]:bg-slate-800"
      }`}
      aria-pressed={slot === value}
    >
      {label}
    </button>
  );

  return (
    <section className="relative grid gap-5 lg:grid-cols-5">
      {/* MAIN FORM */}
      <form onSubmit={submit} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white [.dark_&]:bg-slate-900 p-6 sm:p-8 shadow-[0_22px_60px_rgba(2,132,199,0.14)] lg:col-span-3">
        {/* gradient glows */}
        <div aria-hidden className="pointer-events-none absolute -top-28 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-sky-500/20 to-indigo-500/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-gradient-to-tr from-indigo-400/15 to-sky-400/15 blur-3xl" />

        <div className="flex items-center gap-2 text-[12.5px] font-bold text-slate-600 [.dark_&]:text-slate-300">
          <Star className="h-4 w-4 text-amber-500" /> 4.9/5 su 100+ recensioni • <Clock className="h-4 w-4 text-sky-600 ml-1" /> Risposta entro 2h
        </div>

        {ok && (
          <div role="status" aria-live="polite" className="mt-3 rounded-xl bg-emerald-50 text-emerald-800 px-3 py-2 ring-1 ring-emerald-200">{ok}</div>
        )}
        {err && (
          <div role="alert" className="mt-3 rounded-xl bg-rose-50 text-rose-700 px-3 py-2 ring-1 ring-rose-200">{err}</div>
        )}

        {/* Inputs */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-name" className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">Nome e cognome *</label>
            <div className="mt-1 relative">
              <input
                id="lead-name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="peer mt-0 w-full rounded-2xl border-2 border-slate-200 bg-white [.dark_&]:bg-slate-800 pl-3 pr-3 py-3 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-sky-300"
                placeholder="Es. Giulia Rossi"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="lead-phone" className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">Telefono *</label>
            <div className="mt-1 flex rounded-2xl border-2 border-slate-200 bg-white [.dark_&]:bg-slate-800 focus-within:ring-2 focus-within:ring-sky-300">
              <span className="inline-flex items-center gap-1 pl-3 pr-2 text-[13px] font-black text-slate-500 select-none">+39</span>
              <input
                id="lead-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-r-2xl bg-transparent px-2 py-3 text-[15px] font-semibold focus:outline-none"
                placeholder="Es. 347 123 4567"
                required
              />
            </div>
            <p className="mt-1 text-[11.5px] text-slate-500">Ti chiamiamo o ti scriviamo su WhatsApp.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">Preferisci</label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setContact("call")}
                className={`inline-flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-[13px] font-extrabold transition ${
                  contact === "call" ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-700 [.dark_&]:bg-slate-800"
                }`}
              >
                <Phone className="h-4 w-4" /> Chiamata
              </button>
              <button
                type="button"
                onClick={() => setContact("whatsapp")}
                className={`inline-flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-[13px] font-extrabold transition ${
                  contact === "whatsapp" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 [.dark_&]:bg-slate-800"
                }`}
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">Fascia oraria</label>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Chip value="qualsiasi" label="Qualsiasi" />
              <Chip value="mattina" label="Mattina" />
              <Chip value="pomeriggio" label="Pomeriggio" />
              <Chip value="sera" label="Sera" />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="lead-note" className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">Note (facoltative)</label>
          <textarea
            id="lead-note"
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Es. preferisco lunedì/mercoledì dalle 15 alle 18"
            className="mt-1 w-full rounded-2xl border-2 border-slate-200 bg-white [.dark_&]:bg-slate-800 px-3 py-3 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        {/* Hidden inputs for non-text controls so browsers can autofill/name map */}
        <input type="hidden" name="slot" value={slot} />
        <input type="hidden" name="contact" value={contact} />

        <div className="mt-5">
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-500 px-7 py-3.5 font-black text-white shadow-[0_14px_0_#1d4ed8] hover:from-sky-500 hover:to-indigo-400 active:translate-y-[1px] active:shadow-[0_13px_0_#1d4ed8] disabled:opacity-60"
          >
            {sending ? "Invio…" : "Parla con un tutor"}
          </button>
          <p className="mt-2 text-[12px] text-slate-500 inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Nessuno spam. Usiamo i tuoi dati solo per ricontattarti.</p>
        </div>
      </form>

      {/* TRUST / BENEFITS SIDE */}
      <aside className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50 [.dark_&]:from-slate-900 [.dark_&]:to-slate-800 p-6 sm:p-8 lg:col-span-2">
        <div className="text-[13px] font-black text-slate-700 [.dark_&]:text-slate-200">Perché lasciare i tuoi contatti?</div>
        <ul className="mt-3 space-y-3 text-[14px] font-semibold text-slate-700 [.dark_&]:text-slate-200">
          <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" /> Consulenza gratuita di 10′ sul percorso migliore per te</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" /> Tutor laureati e super selezionati</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" /> Risposta entro poche ore</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" /> 4.9/5 su 100+ recensioni verificate</li>
        </ul>
        <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent [.dark_&]:via-slate-600" />
        <div className="mt-5 text-[13px] font-bold text-slate-600 [.dark_&]:text-slate-300">Cosa succede dopo?</div>
        <ol className="mt-2 space-y-2 text-[13.5px] text-slate-600 [.dark_&]:text-slate-300">
          <li>1) Ti contattiamo nella fascia scelta</li>
          <li>2) Capiamo il tuo obiettivo e il livello</li>
          <li>3) Ti consigliamo il percorso migliore</li>
        </ol>
      </aside>
    </section>
  );
}
