// /sanity/schemas/exercise.ts
import { defineType, defineField } from "sanity";

export default defineType({
  name: "exercise",
  title: "Esercizio",
  type: "document",

  fields: [
    defineField({
      name: "titolo",
      title: "Titolo",
      type: "string",
      validation: (R) => R.required(),
    }),

    // Testo (consegna)
    defineField({
      name: "testo",
      title: "Testo",
      type: "array",
      of: [
        {
          type: "block",
          marks: {
            annotations: [
              {
                name: "inlineLatex",
                type: "object",
                title: "Formula LaTeX inline",
                fields: [
                  {
                    name: "code",
                    type: "string",
                    title: "Codice LaTeX",
                    validation: (Rule) => Rule.required(),
                  },
                ],
              },
            ],
          },
        },
        { type: "latex" },
        { type: "horizontalRule" },
        { type: "lineBreak" },
      ],
      validation: (R) => R.required(),
    }),

    // Soluzione sintetica
    defineField({
      name: "soluzione",
      title: "Soluzione",
      type: "array",
      of: [
        {
          type: "block",
          marks: {
            annotations: [
              {
                name: "inlineLatex",
                type: "object",
                title: "Formula LaTeX inline",
                fields: [
                  {
                    name: "code",
                    type: "string",
                    title: "Codice LaTeX",
                    validation: (Rule) => Rule.required(),
                  },
                ],
              },
            ],
          },
        },
        { type: "latex" },
        { type: "horizontalRule" },
        { type: "lineBreak" },
      ],
    }),

    // Passaggi dettagliati
    defineField({
      name: "passaggi",
      title: "Passaggi",
      type: "array",
      of: [
        {
          type: "block",
          marks: {
            annotations: [
              {
                name: "inlineLatex",
                type: "object",
                title: "Formula LaTeX inline",
                fields: [
                  {
                    name: "code",
                    type: "string",
                    title: "Codice LaTeX",
                    validation: (Rule) => Rule.required(),
                  },
                ],
              },
            ],
          },
        },
        { type: "latex" },
        { type: "horizontalRule" },
        { type: "lineBreak" },
      ],
    }),

    // Link a lezioni
    defineField({
      name: "lezioniCollegate",
      title: "Lezioni collegate",
      type: "array",
      of: [{ type: "reference", to: [{ type: "lesson" }] }],
    }),
  ],

  // Preview robusto (evita "Invalid preview config")
  preview: {
    select: {
      title: "titolo",
      lessonTitle: "lezioniCollegate.0->title",
    },
    prepare({ title, lessonTitle }) {
      return {
        title: title || "(senza titolo)",
        subtitle: lessonTitle ? `Lezione: ${lessonTitle}` : undefined,
      };
    },
  },
});
