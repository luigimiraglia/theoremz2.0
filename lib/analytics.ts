"use client";

import { getAnonId } from "./anonId";

// Genera session ID univoco
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let sessionId = sessionStorage.getItem("tz_session_id");
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("tz_session_id", sessionId);
  }
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
      return parsed.id || parsed.uid || null;
    }
  } catch {}
  return null;
}

// Invia evento al nostro sistema analytics interno
async function sendToAnalytics(eventData: any) {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });
  } catch (error) {
    console.error("Errore invio analytics:", error);
  }
}

// Traccia pageview
export function pageview(path: string) {
  try {
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
}

