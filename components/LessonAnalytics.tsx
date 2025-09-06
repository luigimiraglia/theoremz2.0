"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

type Props = {
  id: string;
  slug: string;
  title: string;
  materia?: string | null;
  categoria?: string[] | null;
};

export default function LessonAnalytics({ id, slug, title, materia, categoria }: Props) {
  useEffect(() => {
    if (!id || !slug) return;
    track("lesson_view", {
      lesson_id: id,
      lesson_slug: slug,
      lesson_title: title,
      materia: materia || undefined,
      categoria: (categoria || [])?.slice(0, 5).join(", ") || undefined,
    });
    // fire once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug]);

  return null;
}

