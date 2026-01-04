"use client";

import { getAnonId } from "./anonId";
import { identifyBlackSession } from "./black/sessionTracker";

// Genera session ID univoco
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let sessionId = sessionStorage.getItem("tz_session_id");
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("tz_session_id", sessionId);
  }
  identifyBlackSession({ sessionId });
  return sessionId;
}

// Ottieni user ID se disponibile
function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  
  // Puoi personalizzare questa logica in base al tuo sistema di auth
  try {
    const userData = localStorage.getItem("user_data");
    if (userData) {
      const parsed = JSON.parse(userData);
      const id = parsed.id || parsed.uid || null;
      identifyBlackSession({ userId: id || undefined });
      return id;
    }
  } catch {}
  return null;
}

const ANALYTICS_BATCH_SIZE = 8;
const ANALYTICS_FLUSH_MS = 2000;
const analyticsQueue: any[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushQueue();
  }, ANALYTICS_FLUSH_MS);
}

function flushQueue() {
  if (typeof window === "undefined") return;
  if (!analyticsQueue.length) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const batch = analyticsQueue.splice(0, analyticsQueue.length);
  const payload =
    batch.length === 1 ? JSON.stringify(batch[0]) : JSON.stringify(batch);
  const url = "/api/analytics";

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([payload], { type: "application/json" });
    const ok = navigator.sendBeacon(url, blob);
    if (ok) return;
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

// Invia evento al nostro sistema analytics interno
async function sendToAnalytics(eventData: any) {
  if (typeof window === "undefined") return;
  analyticsQueue.push(eventData);
  if (analyticsQueue.length >= ANALYTICS_BATCH_SIZE) {
    flushQueue();
  } else {
    scheduleFlush();
  }
}

// Traccia pageview
export function pageview(path: string) {
  try {
    if (typeof window === "undefined") return;
    const eventData = {
      event: "page_view",
      page: path,
      sessionId: getSessionId(),
      userId: getUserId(),
      anonId: getAnonId(),
      params: {
        page_title: document?.title || undefined,
        referrer: document?.referrer || undefined,
      },
    };
    
    sendToAnalytics(eventData);
  } catch (error) {
    console.error("Errore pageview:", error);
  }
}

// Traccia evento generico
export function track(event: string, params?: Record<string, any>) {
  try {
    if (typeof window === "undefined") return;
    const eventData = {
      event,
      page: window.location.pathname,
      sessionId: getSessionId(),
      userId: getUserId(),
      anonId: getAnonId(),
      params: params || {},
    };
    
    sendToAnalytics(eventData);
  } catch (error) {
    console.error("Errore track:", error);
  }
}

// Traccia conversione
export function trackConversion(type: string, value?: string, params?: Record<string, any>) {
  try {
    if (typeof window === "undefined") return;
    const eventData = {
      event: "conversion",
      page: window.location.pathname,
      sessionId: getSessionId(),
      userId: getUserId(),
      anonId: getAnonId(),
      params: {
        conversion_type: type,
        conversion_value: value,
        ...params,
      },
    };
    
    sendToAnalytics(eventData);
  } catch (error) {
    console.error("Errore trackConversion:", error);
  }
}

// Identifica utente loggato
export function identify(userId: string | null | undefined) {
  try {
    if (typeof window === "undefined") return;
    if (!userId) return;
    
    // Salva user ID per sessioni future
    if (typeof window !== "undefined") {
      localStorage.setItem("user_data", JSON.stringify({ id: userId }));
    }
    
    track("user_identified", { user_id: userId });
  } catch (error) {
    console.error("Errore identify:", error);
  }
}

// Traccia inizio sessione
export function startSession() {
  try {
    if (typeof window === "undefined") return;
    const sessionData = {
      event: "session_start",
      page: window.location.pathname,
      sessionId: getSessionId(),
      userId: getUserId(),
      anonId: getAnonId(),
      params: {
        landing_page: window.location.pathname,
        referrer: document?.referrer || undefined,
        user_agent: navigator?.userAgent || undefined,
      },
    };
    
    sendToAnalytics(sessionData);
  } catch (error) {
    console.error("Errore startSession:", error);
  }
}

// Inizializza tracking automatico
if (typeof window !== "undefined") {
  // Inizia sessione al primo caricamento
  document.addEventListener("DOMContentLoaded", () => {
    startSession();
  });
  
  // Traccia cambio pagina (per SPA)
  let currentPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== currentPath) {
      currentPath = window.location.pathname;
      pageview(currentPath);
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });

  const flushOnHide = () => flushQueue();
  window.addEventListener("pagehide", flushOnHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushOnHide();
    }
  });
}
