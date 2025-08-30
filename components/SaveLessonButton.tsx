"use client";
import { useState, useMemo } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import type { User as FirebaseUser } from "firebase/auth";

type AuthReturn = {
  user: (FirebaseUser & { uid: string }) | null;
  savedLessons: string[];
  refreshSavedLessons: () => Promise<void>;
};

export default function SaveLessonButton({
  lessonSlug,
  className = "",
}: {
  lessonSlug: string | undefined;
  className?: string;
}) {
  const { user, savedLessons, refreshSavedLessons } = useAuth() as AuthReturn;
  const [busy, setBusy] = useState(false);

  const slug = useMemo(
    () => (typeof lessonSlug === "string" ? lessonSlug.trim() : ""),
    [lessonSlug]
  );
  const isValid = slug.length > 0;

  const isSaved =
    savedLessons && Array.isArray(savedLessons) && savedLessons.includes(slug);

  const toggle = async () => {
    if (!user || !isValid || busy) return;
    setBusy(true);
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists() || !Array.isArray(snap.data()?.savedLessons)) {
        await setDoc(ref, { savedLessons: [] }, { merge: true });
      }

      await updateDoc(ref, {
        savedLessons: isSaved ? arrayRemove(slug) : arrayUnion(slug),
      });

      await refreshSavedLessons?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={!user || !isValid || busy}
      className={`inline-flex shadow-md items-center font-semibold gap-1 px-2 py-1 text-sm rounded-lg transition-all duration-300 border 
        ${
          isSaved
            ? "bg-yellow-400 border-yellow-500 text-black hover:bg-yellow-300"
            : "bg-blue-600 border-blue-700 text-white hover:bg-blue-500"
        }
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={
        !isValid
          ? "Slug non valido"
          : isSaved
            ? "Rimuovi dai salvati"
            : "Salva lezione"
      }
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-[18px] w-[18px] transition-colors duration-300 ${isSaved ? "fill-yellow-700" : "fill-white"}`}
      >
        <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" />
      </svg>
      {isSaved ? "Salvata" : "Salva lezione"}
    </button>
  );
}
