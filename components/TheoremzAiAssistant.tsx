"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import BlackPopup from "./BlackPopup";
import MessageBubble from "./MessageBubble";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export default function TheoremzAIAssistant({
  lessonId,
  lessonTitle,
  initialPrompt,
}: {
  lessonId?: string;
  lessonTitle?: string;
  initialPrompt?: string;
}) {
  const { isSubscribed, user } = useAuth();

  const [open, setOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const handleOpen = () => {
    if (!true) {
      setShowBanner(true);
      return;
    }
    setOpen((v) => !v);
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: Date.now(),
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    setTyping(true);

    try {
      const res = await fetch("/api/theoremz-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          lessonTitle,
          messages: [
            {
              role: "system",
              content: systemPrompt({ lessonId, lessonTitle }),
            },
            ...messages.map(({ role, content }) => ({ role, content })),
            { role: "user", content },
          ],
          userId: user?.uid ?? undefined,
          isSubscribed,
        }),
      });

      if (!res.ok) throw new Error("AI request failed");
      const data = (await res.json()) as { reply?: string };

      const aiMsg: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply ?? "⚠️ Errore inatteso. Riprova tra poco.",
        createdAt: Date.now(),
      };
      setMessages((m) => [...m, aiMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "⚠️ C'è stato un problema a contattare l'AI. Riprova tra un attimo.",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
      setTyping(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-16 sm:bottom-19 right-3 z-50 rounded-2xl px-5 py-2.5 text-white shadow-xl bg-gradient-to-r from-violet-700 to-purple-600 hover:from-violet-800 hover:to-purple-700 active:scale-95 transition-all flex items-center gap-2"
        aria-label="Apri Theoremz AI"
      >
        <SparklesIcon className="h-5 w-5" />
        <span className="font-semibold tracking-wide">Theoremz AI</span>
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-16 sm:bottom-34 right-3 z-50 w-[92vw] max-w-md rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_10px_40px_rgba(110,65,255,0.25)] overflow-hidden">
          {/* Header */}
          <div className="relative px-4 py-3 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">
                    Theoremz AI Tutor
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    Online
                  </span>
                </div>
                <span className="block text-[11px] opacity-85 truncate">
                  {lessonTitle
                    ? `Lezione: ${lessonTitle}`
                    : "Assistente didattico"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMessages([])}
                  className="text-[11px] px-2 py-1 rounded-md bg-white/15 hover:bg-white/25"
                  title="Nuova chat"
                >
                  Reset
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-white/20"
                  aria-label="Chiudi chat"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="p-3 max-h-[55vh] overflow-y-auto space-y-3 bg-gradient-to-b from-white/80 to-white">
            {messages.length === 0 && (
              <div className="text-sm text-gray-700">
                {initialPrompt ??
                  "Chiedimi aiuto su questa lezione. Posso spiegare, generare esempi ed esercizi guidati."}
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    "Spiegami i passaggi chiave",
                    "Fammi 3 esempi con soluzioni",
                    "Quiz veloce a risposta multipla",
                    "Ricapitola la teoria in 5 punti",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-[11px] px-2 py-1 rounded-full border border-gray-200 hover:bg-gray-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                createdAt={m.createdAt}
              />
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md px-3 py-2 text-sm shadow">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Scrivi un messaggio…"
                rows={1}
                className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 max-h-36"
              />
              <button
                onClick={sendMessage}
                disabled={sending}
                className="rounded-xl px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {sending ? "…" : "Invia"}
              </button>
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              Invio per inviare • Shift+Invio per andare a capo
            </div>
          </div>
        </div>
      )}

      {/* Banner per non abbonati */}
      {showBanner && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50"
          onClick={() => setShowBanner(false)}
        >
          <div
            className="w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <BlackPopup />
          </div>
        </div>
      )}
    </>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M5 12l2-4 2 4 4 2-4 2-2 4-2-4-4-2 4-2zM17 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM19 13l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M6 6l12 12M18 6l-12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.2s]" />
      <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce [animation-delay:0s]" />
      <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce [animation-delay:0.2s]" />
    </div>
  );
}

function systemPrompt({
  lessonId,
  lessonTitle,
}: {
  lessonId?: string;
  lessonTitle?: string;
}) {
  return [
    "Sei Theoremz AI Tutor. Rispondi in modo chiaro, conciso e step-by-step.",
    "Usa SEMPRE Markdown.",
    // 👉 Usa i dollari, niente \(...\)
    "Per le formule usa LaTeX: $ ... $ per inline e $$ ... $$ per display. Non sfuggire i dollari.",
    "Mantieni grassetto con **...** e liste ordinate quando utili.",
    lessonId ? `Contesto: lessonId=${lessonId}` : null,
    lessonTitle ? `Titolo lezione: ${lessonTitle}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
