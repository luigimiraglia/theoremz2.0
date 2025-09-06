"use client";

// Lightweight anonymous ID helper (first-party, long-lived)
// - Stores in localStorage and mirrors in a cookie for server logs if needed
// - Uses crypto.randomUUID when available

const KEY = "tz_anon_id_v1";

function fallbackUuid() {
  // RFC4122-ish fallback; not cryptographically strong
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getAnonId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id: string = localStorage.getItem(KEY) ?? "";
    if (!id) {
      id =
        typeof crypto !== "undefined" && (crypto as any).randomUUID
          ? (crypto as any).randomUUID()
          : fallbackUuid();
      localStorage.setItem(KEY, id);
    }
    // Mirror to cookie (365d) for potential server usage
    try {
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `tz_anon_id=${id}; path=/; expires=${expires}; samesite=lax`;
    } catch {}
    return id;
  } catch {
    return null;
  }
}
