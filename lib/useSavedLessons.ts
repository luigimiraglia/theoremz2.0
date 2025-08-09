"use client";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

export type SavedLesson = {
  lessonId: string;
  slug: string;
  title: string;
  thumb?: string;
  savedAt: number;
};

export function useSavedLessons() {
  const [items, setItems] = useState<SavedLesson[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const token = await getAuth().currentUser?.getIdToken();
    const res = await fetch("/api/me/saved-lessons", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);
  return { items, loading, refresh: fetchAll };
}
