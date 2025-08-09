// /sanity/schemas/sectionTitle.ts
import { defineType, defineField } from "sanity";

export const sectionTitle = defineType({
  name: "section",
  title: "Sezione (con indice)",
  type: "object",
  fields: [
    defineField({
      name: "heading",
      title: "Titolo visibile",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "shortTitle",
      title: "Titolo per l’indice (breve)",
      type: "string",
      validation: (Rule) => Rule.required().max(40),
    }),
  ],
  preview: {
    select: {
      title: "heading",
      subtitle: "shortTitle",
    },
    prepare({ title, subtitle }) {
      return {
        title,
        subtitle: `Indice: ${subtitle}`,
      };
    },
  },
});
