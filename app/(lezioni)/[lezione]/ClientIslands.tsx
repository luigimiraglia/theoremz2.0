"use client";

import dynamic from "next/dynamic";
import type { PortableTextBlock } from "sanity";

const LessonClient = dynamic(() => import("./LessonClient"), {
  ssr: false,
  loading: () => null,
});

type SectionItem = { _type: "section"; heading: string; shortTitle: string };

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
  };
  sectionItems: SectionItem[];
}) {
  return <LessonClient {...props} />;
}
