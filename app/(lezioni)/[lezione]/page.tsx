import { groq } from "next-sanity";
import { notFound } from "next/navigation";
import { sanityFetch } from "@/lib/sanityFetch";
import type { PortableTextBlock } from "sanity";
import LessonClient from "./LessonClient";

export const dynamic = "force-dynamic"; // evita prerender

type LessonResources = {
  formulario?: string | null;
  appunti?: string | null;
  videolezione?: string | null;
};
type LessonDoc = {
  _id: string;
  title: string;
  subtitle?: string | null;
  slug: { current: string };
  thumbnailUrl?: string | null;
  resources?: LessonResources;
  content: PortableTextBlock[];
};
type SectionBlock = PortableTextBlock & {
  _type: "section";
  heading?: string;
  shortTitle?: string;
};

const lessonBySlugQuery = groq`
  *[_type == "lesson" && slug.current == $slug][0]{
    _id, title, subtitle, slug, thumbnailUrl, resources, content
  }
`;
const allLessonSlugsQuery = groq`
  *[_type == "lesson" && defined(slug.current)].slug.current
`;
export async function generateStaticParams(): Promise<{ lezione: string }[]> {
  const slugs = await sanityFetch<string[]>(allLessonSlugsQuery);
  return slugs.map((slug) => ({ lezione: slug }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ lezione: string }>;
}) {
  const { lezione } = await params;

  const lesson = await sanityFetch<LessonDoc>(lessonBySlugQuery, {
    slug: lezione,
  });
  if (!lesson) notFound();

  const sections: SectionBlock[] = (lesson.content ?? []).filter(
    (b): b is SectionBlock => (b as { _type?: string })._type === "section"
  );
  const sectionItems = sections
    .map((s, i) => {
      const heading = s.heading ?? s.shortTitle;
      if (!heading) return null;
      return {
        _type: "section" as const,
        heading,
        shortTitle: s.shortTitle ?? heading,
      };
    })
    .filter(
      (x): x is { _type: "section"; heading: string; shortTitle: string } =>
        x !== null
    );

  return (
    <LessonClient
      lezione={lezione}
      lesson={{
        id: lesson._id,
        title: lesson.title,
        subtitle: lesson.subtitle ?? null,
        slug: lesson.slug.current,
        thumbnailUrl: lesson.thumbnailUrl ?? null,
        resources: lesson.resources ?? {},
        content: lesson.content,
      }}
      sectionItems={sectionItems}
    />
  );
}
