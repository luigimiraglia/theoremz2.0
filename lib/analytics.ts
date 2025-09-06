"use client";

import { getAnonId } from "./anonId";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

function hasGtag() {
  return typeof window !== "undefined" && typeof window.gtag === "function" && !!MEASUREMENT_ID;
}

// Queue a page view
export function pageview(path: string) {
  try {
    if (!hasGtag()) return;
    window.gtag!("event", "page_view", {
      page_path: path,
      page_title: document?.title || undefined,
    });
  } catch {}
}

// Generic event tracker — lightweight and safe if GA not configured
export function track(event: string, params?: Record<string, any>) {
  try {
    if (!hasGtag()) return;
    const anon = getAnonId();
    const payload = { ...(params || {}), tz_anon_id: anon || undefined };
    window.gtag!("event", event, payload);
  } catch {}
}

// Identify logged-in users (sets GA user_id)
export function identify(userId: string | null | undefined) {
  try {
    if (!hasGtag()) return;
    const uid = (userId || "").toString().trim();
    if (!uid) return;
    // user_id is configured on config per GA4 guidance
    window.gtag!("config", MEASUREMENT_ID, { user_id: uid });
  } catch {}
}

// Set custom user properties (visible in GA as user-scoped dimensions if configured)
export function setUserProps(props: Record<string, any>) {
  try {
    if (!hasGtag()) return;
    window.gtag!("set", "user_properties", props);
  } catch {}
}

