"use client";
import { useEffect, useState, useCallback } from "react";
import { getAuth } from "firebase/auth";
import { useAuth } from "@/lib/AuthContext";

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
  const { user } = useAuth();

  const fetchAll = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("missing_token");
      const res = await fetch("/api/me/saved-lessons", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_failed");
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("[useSavedLessons] fetch failed", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  return { items, loading, refresh: fetchAll };
}
