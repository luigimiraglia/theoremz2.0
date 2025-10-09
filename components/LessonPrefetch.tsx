"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface LessonPrefetchProps {
  currentLessonId: string;
  relatedLessons?: Array<{
    slug: string;
    title: string;
  }>;
  formularioUrl?: string;
  videolezioneUrl?: string;
}

export default function LessonPrefetch({ 
  currentLessonId, 
  relatedLessons, 
  formularioUrl, 
  videolezioneUrl 
}: LessonPrefetchProps) {
  const router = useRouter();

  useEffect(() => {
    // Prefetch risorse correlate con priorità bassa dopo il caricamento iniziale
    const prefetchResources = () => {
      // Prefetch lezioni correlate per navigazione rapida
      relatedLessons?.slice(0, 3).forEach(lesson => {
        router.prefetch(`/${lesson.slug}`);
      });

      // Prefetch formulario se presente
      if (formularioUrl) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = formularioUrl;
        document.head.appendChild(link);
      }

      // Preload video se presente (priorità più alta)
      if (videolezioneUrl) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = videolezioneUrl;
        link.as = 'video';
        document.head.appendChild(link);
      }

      // Prefetch pagina flashcards
      router.prefetch(`/flashcards?lesson=${currentLessonId}`);
    };

    // Esegui prefetch dopo 2 secondi per non interferire con il caricamento iniziale
    const timer = setTimeout(prefetchResources, 2000);
    return () => clearTimeout(timer);
  }, [currentLessonId, relatedLessons, formularioUrl, videolezioneUrl, router]);

  return null; // Component invisibile
}