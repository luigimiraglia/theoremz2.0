"use client";

// Import static to avoid hydration flicker
import LessonClient from "./LessonClient";
import type { PortableTextBlock } from "sanity";

type SectionItem = { _type: "section"; heading: string; shortTitle: string };
type LinkedLesson = { title: string; slug: { current: string } };

export default function ClientIslands(props: {
  lezione: string;
  lesson: {
    id: string;
    title: string;
    subtitle: string | null;
    slug: string;
    thumbnailUrl: string | null;
    resources: {
      formulario?: string | null;
      appunti?: string | null;
      videolezione?: string | null;
    };
    content: PortableTextBlock[];
    // ⬇️ aggiunti i prerequisiti
    lezioniPropedeuticheObbligatorie?: LinkedLesson[];
    lezioniPropedeuticheOpzionali?: LinkedLesson[];
  };
  sectionItems: SectionItem[];
}) {
  return <LessonClient {...props} />;
}
