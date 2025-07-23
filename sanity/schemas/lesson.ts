// /sanity/schemas/lesson.ts
import { defineType, defineField } from "sanity";

/* ─────────── Oggetti custom ─────────── */

/*  Horizontal Rule  */
export const horizontalRule = defineType({
  name: "horizontalRule",
  title: "Horizontal rule",
  type: "object",
  fields: [
    {
      name: "hidden",
      type: "string",
      hidden: true,
      initialValue: "hr", // puro segnaposto
    },
  ],
  preview: { prepare: () => ({ title: "────────" }) },
});

/*  Line Break  */
export const lineBreak = defineType({
  name: "lineBreak",
  title: "Line break",
  type: "object",
  fields: [
    {
      name: "hidden",
      type: "string",
      hidden: true,
      initialValue: "br",
    },
  ],
  preview: { prepare: () => ({ title: "<br />" }) },
});

export const latex = defineType({
  name: "latex",
  title: "LaTeX",
  type: "object",
  fields: [
    defineField({
      name: "code",
      title: "Codice",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "display",
      type: "boolean",
      title: "Display mode (\\displaystyle)",
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: "code" },
    prepare: ({ title }) => ({ title: `\\(${title?.slice(0, 20)}…\\)` }),
  },
});

/* ─────────── Documento Lezione ─────────── */

export default defineType({
  name: "lesson",
  title: "Lezione",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Titolo",
      type: "string",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (R) => R.required(),
    }),
    defineField({
      name: "content",
      title: "Contenuto",
      type: "array",
      of: [
        /* block rich‑text */
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "Heading 2", value: "h2" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Underline", value: "underline" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  { name: "href", type: "url", title: "URL" },
                  {
                    name: "blank",
                    type: "boolean",
                    title: "Apri in nuova scheda",
                    initialValue: true,
                  },
                ],
              },
            ],
          },
        },
        { type: "horizontalRule" }, // nostro oggetto custom
        { type: "lineBreak" }, // nostro oggetto custom
        { type: "latex" }, // LaTeX
      ],
    }),
  ],
});
