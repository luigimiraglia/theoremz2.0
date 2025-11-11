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
  initialOpen,
}: {
  lessonId?: string;
  lessonTitle?: string;
  initialPrompt?: string;
  initialOpen?: boolean;
}) {
  const { isSubscribed, user } = useAuth();

  const [open, setOpen] = useState(!!initialOpen);
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

  const toggleChat = (nextState?: boolean) => {
    const target = typeof nextState === "boolean" ? nextState : !open;
    if (target && !isSubscribed) {
      setShowBanner(true);
      return;
    }
    setOpen(target);
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

  const containerSize = open
    ? "w-[92vw] max-w-md"
    : "w-[52vw] min-w-[200px] max-w-[210px]";
  const containerOffset = open
    ? "bottom-16 sm:bottom-32"
    : "bottom-16 sm:bottom-24";
  const containerRight = open ? "right-3" : "right-3 sm:right-4";
  const headerPadding = open ? "px-4 py-3" : "px-3 py-2";
  const titleSize = open ? "text-lg" : "text-sm";
  const iconWrapperSize = open ? "h-9 w-9" : "h-8 w-8";
  const sparklesSize = open ? "h-5 w-5" : "h-4 w-4";
  const statusDotSize = open ? "h-2.5 w-2.5" : "h-2 w-2";

  return (
    <>
      <div
        className={`fixed ${containerOffset} ${containerRight} z-50 ${containerSize} transition-all duration-300`}
      >
        <div
          className={`rounded-2xl bg-white/85 backdrop-blur-2xl shadow-[0_10px_35px_rgba(110,65,255,0.25)] overflow-hidden transition-[box-shadow] duration-300 ${
            open
              ? "shadow-[0_15px_45px_rgba(110,65,255,0.35)]"
              : "shadow-[0_8px_30px_rgba(110,65,255,0.15)]"
          }`}
        >
          {/* Header always visible */}
          <div
            className={`relative ${headerPadding} bg-gradient-to-r from-violet-600/95 to-fuchsia-600/95 text-white ${
              open ? "" : "cursor-pointer"
            }`}
            role={!open ? "button" : undefined}
            tabIndex={!open ? 0 : undefined}
            onClick={!open ? () => toggleChat(true) : undefined}
            onKeyDown={
              !open
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleChat(true);
                    }
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-3 relative">
              <div
                className={`${iconWrapperSize} rounded-xl bg-white/20 flex items-center justify-center`}
              >
                <SparklesIcon className={sparklesSize} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`${titleSize} font-semibold tracking-wide truncate`}
                  >
                    Ai Tutor
                  </span>
                  <span
                    className={`inline-flex items-center justify-center rounded-full bg-emerald-300 animate-pulse shadow-[0_0_6px_rgba(110,255,183,0.8)] ${statusDotSize}`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleChat()}
                  className="inline-flex items-center justify-center rounded-lg p-2 bg-white/20 text-white hover:bg-white/30 transition"
                  aria-label={open ? "Comprimi chat" : "Espandi chat"}
                  aria-expanded={open}
                  aria-controls="theoremz-ai-panel"
                >
                  {open ? (
                    <ExpandIcon className="h-4 w-4" />
                  ) : (
                    <CollapseIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible content */}
          <div
            id="theoremz-ai-panel"
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
              open
                ? "max-h-[70vh] opacity-100"
                : "max-h-0 opacity-0 pointer-events-none"
            }`}
            aria-hidden={!open}
          >
            {/* Messages */}
            <div className="p-3 max-h-[55vh] overflow-y-auto space-y-3 bg-gradient-to-b from-white/85 to-white">
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
                  className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 max-h-36"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? "…" : "Invia"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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

function ExpandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M6 15l6-6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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
