import { defineType, defineField } from "sanity";

export default defineType({
  name: "imageExternal",
  title: "Immagine da URL",
  type: "object",
  fields: [
    defineField({
      name: "url",
      title: "URL immagine",
      type: "url",
      validation: (Rule) => Rule.uri({ scheme: ["http", "https"] }).required(),
    }),
    defineField({
      name: "alt",
      title: "Descrizione (alt)",
      type: "string",
    }),
  ],
  preview: {
    select: { title: "alt", media: "url" },
    prepare({ title }) {
      return { title: title || "Immagine da URL" };
    },
  },
});
