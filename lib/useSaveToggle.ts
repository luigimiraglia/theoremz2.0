// lib/useSaveToggle.ts
"use client";

import { useCallback, useState } from "react";
import { getAuth } from "firebase/auth";

export type LessonMeta = {
  id: string;
  slug: string;
  title: string;
  thumb?: string | null; // 👈 accetta anche null
};

export function useSaveToggle(initiallySaved: boolean, lesson: LessonMeta) {
  const [saved, setSaved] = useState(!!initiallySaved);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    const token = await getAuth().currentUser?.getIdToken();

    try {
      if (saved) {
        await fetch(`/api/me/saved-lessons/${encodeURIComponent(lesson.id)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setSaved(false);
      } else {
        await fetch(`/api/me/saved-lessons`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lessonId: lesson.id,
            slug: lesson.slug,
            title: lesson.title,
            thumb: lesson.thumb ?? null, // 👈 normalizzo qui per l’API
          }),
        });
        setSaved(true);
      }
    } finally {
      setLoading(false);
    }
  }, [saved, lesson, loading]);

  return { saved, loading, toggle };
}
