import { groq } from "next-sanity";

export const lessonBySlugQuery = groq`
  *[_type == "lesson" && slug.current == $slug][0]{
    _id,
    title,
    content[],
    formule[]{
      formula,
      explanation,
      difficulty
    }
  }
`;

export const allLessonSlugsQuery = groq`
  *[_type == "lesson" && defined(slug.current)].slug.current
`;
