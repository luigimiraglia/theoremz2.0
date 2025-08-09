"use client";
import dynamic from "next/dynamic";

// importa il vero viewer solo sul client (niente SSR → niente DOMMatrix)
const LessonNotes = dynamic(() => import("@/components/LessonNotes"), {
  ssr: false,
});

type Props = {
  lessonTitle: string;
  lessonSlug: string;
};

export default function LessonNotesClient(props: Props) {
  return <LessonNotes {...props} />;
}
