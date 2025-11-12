 "use client";

type SessionContext = {
  sessionId?: string | null;
  userId?: string | null;
};

const BLACK_TRACK_KEY = "tz_black_session";

export function identifyBlackSession(context: SessionContext) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const prev = safeRead();
  const next = {
    sessionId: context.sessionId || prev.sessionId,
    userId: context.userId || prev.userId,
    lastUpdated: new Date().toISOString(),
  };
  window.localStorage.setItem(BLACK_TRACK_KEY, JSON.stringify(next));
  if (next.userId && typeof navigator !== "undefined") {
    try {
      navigator.sendBeacon?.(
        "/api/black/activity",
        JSON.stringify({ userId: next.userId, sessionId: next.sessionId })
      );
    } catch {
      fetch("/api/black/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: next.userId, sessionId: next.sessionId }),
      }).catch(() => {});
    }
  }
}

function safeRead() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BLACK_TRACK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
