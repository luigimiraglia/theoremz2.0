"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { track as vaTrack } from "@vercel/analytics";
import { useAuth } from "@/lib/AuthContext";

type Props = {
  id: string;
  slug: string;
  title: string;
  materia?: string | null;
  categoria?: string[] | null;
};

export default function LessonAnalytics({ id, slug, title, materia, categoria }: Props) {
  const { user } = useAuth();

  useEffect(() => {
    if (!id || !slug) return;

    const vaProps = {
      slug,
      materia: materia || undefined,
      categoria: (categoria || []).slice(0, 5).join(", ") || undefined,
    };

    // Sistema custom (esistente)
    track("lesson_view", { lesson_id: id, lesson_slug: slug, lesson_title: title, ...vaProps });
    // Vercel Analytics
    vaTrack("lesson_view", vaProps);

    // Scroll depth: 50% e 90%
    let scroll50 = false;
    let scroll90 = false;
    let rafPending = false;

    const onScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        if (docH <= 0) return;
        const pct = (window.scrollY / docH) * 100;
        if (!scroll50 && pct >= 50) { scroll50 = true; vaTrack("lesson_scroll_50", vaProps); }
        if (!scroll90 && pct >= 90) { scroll90 = true; vaTrack("lesson_scroll_90", vaProps); }
      });
    };

    // 60s sulla pagina: evento aggregato + salva su Supabase se loggato
    const engagedTimer = setTimeout(async () => {
      vaTrack("lesson_engaged", vaProps);

      if (user?.uid) {
        try {
          const { getAuth } = await import("firebase/auth");
          const token = await getAuth().currentUser?.getIdToken();
          if (!token) return;
          fetch("/api/me/track-lesson", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ slug }),
            keepalive: true,
          }).catch(() => {});
        } catch {}
      }
    }, 60_000);

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(engagedTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug, user?.uid]);

  return null;
}

