"use client";

import { useState } from "react";
import { Star, Send, CheckCircle2 } from "lucide-react";
import { track } from "@/lib/analytics";

export default function LessonReviewForm({
  lessonSlug,
  onCancel,
}: {
  lessonSlug: string;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    setErr(null);
    if (honeypot.trim()) {
      setOk("Grazie! Recensione registrata.");
      return;
    }
    if (!name.trim() || !comment.trim() || rating < 1) {
      setErr("Inserisci nome, voto e un breve commento.");
      return;
    }
    setSending(true);
    try {
      try {
        track("review_submit_clicked", { lesson: lessonSlug, rating });
      } catch {}
      const res = await fetch(`/api/lessons/${encodeURIComponent(lessonSlug)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email || null, rating, comment }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Errore invio");
      setOk("Grazie per la recensione! 💙");
      try { track("review_submitted", { lesson: lessonSlug, rating }); } catch {}
      setName("");
      setEmail("");
      setRating(0);
      setComment("");
    } catch (e: any) {
      setErr(e?.message || "Errore invio");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4 rounded-2xl border border-amber-300/60 bg-white [.dark_&]:bg-slate-900 p-4 sm:p-6 shadow-sm">
      <h3 className="text-lg font-extrabold text-slate-900 [.dark_&]:text-white">
        Lascia una recensione
      </h3>
      <p className="text-sm text-slate-600 [.dark_&]:text-slate-300">
        Aiuta altri studenti a capire se questa lezione è stata utile.
      </p>

      {ok && (
        <div role="status" aria-live="polite" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-800 px-3 py-2 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-4 w-4" /> {ok}
        </div>
      )}
      {err && (
        <div role="alert" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-50 text-rose-700 px-3 py-2 ring-1 ring-rose-200">
          {err}
        </div>
      )}

      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => {
          const v = i + 1;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setRating(v)}
              className={`p-2 rounded-md transition ${
                rating >= v
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-slate-400 hover:text-slate-500"
              }`}
              aria-label={`${v} stelle`}
              aria-pressed={rating === v}
            >
              <Star className="h-6 w-6 fill-current" />
            </button>
          );
        })}
        <span className="ml-2 text-sm font-semibold text-slate-700 [.dark_&]:text-slate-200">
          {rating > 0 ? `${rating}/5` : "Valuta"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">Nome *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-amber-300/60 bg-white [.dark_&]:bg-slate-800 px-3 py-2.5 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="Es. Giulia"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">Email (facoltativa)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-amber-300/60 bg-white [.dark_&]:bg-slate-800 px-3 py-2.5 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="tu@esempio.it"
          />
        </div>
      </div>

      <div>
        <label className="block text-[12.5px] font-black text-slate-800 [.dark_&]:text-slate-100">Commento *</label>
        <textarea
          required
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border-2 border-amber-300/60 bg-white [.dark_&]:bg-slate-800 px-3 py-2.5 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300"
          placeholder="Cosa ti è piaciuto o cosa miglioreresti?"
        />
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-2.5 font-black text-black shadow-[0_8px_0_#b45309] hover:from-amber-400 hover:to-yellow-300 active:translate-y-[1px] active:shadow-[0_7px_0_#b45309] disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {sending ? "Invio…" : "Invia recensione"}
        </button>
        {onCancel && (
          <button
            type="button"
            disabled={sending}
            onClick={onCancel}
            className="text-[13px] font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-700"
          >
            Annulla
          </button>
        )}
      </div>
    </form>
  );
}

