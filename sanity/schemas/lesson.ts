// /sanity/schemas/lesson.ts
import React from "react";
import { defineType, defineField } from "sanity";

/* ─────────── Oggetti custom ─────────── */

/*  Horizontal Rule  */
export const horizontalRule = defineType({
  name: "horizontalRule",
  title: "Horizontal rule",
  type: "object",
  fields: [
    {
      name: "hidden",
      type: "string",
      hidden: true,
      initialValue: "hr",
    },
  ],
  preview: { prepare: () => ({ title: "────────" }) },
});

/*  Line Break  */
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
      title: "Display mode (\\displaystyle)",
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: "code" },
    prepare: ({ title }) => ({ title: `\\(${title?.slice(0, 20)}…\\)` }),
  },
});

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

/* ─────────── Documento Lezione ─────────── */

export const formulaFlashcard = defineType({
  name: "formulaFlashcard",
  title: "Formula da memorizzare",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Titolo (mnemonico)",
      type: "string",
      description:
        "Breve etichetta per ricordare a colpo d’occhio (es. “Teorema di Pitagora”).",
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({
      name: "formula",
      title: "Formula (LaTeX)",
      type: "string",
      description:
        "La formula in LaTeX senza delimitatori ($$, \\[\\], \\(\\)).",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "explanation",
      title: "Descrizione",
      type: "text",
      description: "Spiegazione breve (≤ 150 caratteri).",
      validation: (Rule) => Rule.required().max(150),
    }),
    defineField({
      name: "difficulty",
      title: "Difficoltà",
      type: "number",
      options: {
        list: [
          { title: "Base", value: 1 },
          { title: "Intermedio", value: 2 },
          { title: "Avanzato", value: 3 },
        ],
        layout: "radio",
      },
      initialValue: 1,
      validation: (Rule) => Rule.required().min(1).max(3),
    }),
  ],
  preview: {
    select: { title: "title", formula: "formula" },
    prepare({ title, formula }) {
      return {
        title: title || "(senza titolo)",
        subtitle: formula?.slice(0, 60) || "",
      };
    },
  },
});

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
      name: "subtitle",
      title: "Sottotitolo",
      type: "string",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "nomeAbbreviato",
      title: "Nome abbreviato pagina indice",
      type: "string",
      description: "Titolo breve per la pagina di ricerca",
    }),
    defineField({
      name: "materia",
      title: "Materia",
      type: "string",
      validation: (Rule) => Rule.required(),
      options: {
        list: [
          { title: "Fisica", value: "fisica" },
          { title: "Matematica", value: "matematica" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (R) => R.required(),
    }),
    defineField({
      name: "formule",
      title: "Formule da memorizzare",
      description:
        "Lista delle formule importanti da memorizzare per questa lezione",
      type: "array",
      of: [{ type: "formulaFlashcard" }],
    }),
    defineField({
      name: "content",
      title: "Contenuto",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "Heading 2", value: "h2" },
          ],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Numbered", value: "number" },
          ],
          marks: {
            decorators: [
              {
                title: "Corsivo",
                value: "italic",
                icon: () => React.createElement("span", null, "I"),
                component: (props: { children: React.ReactNode }) =>
                  React.createElement(
                    "em",
                    { style: { fontStyle: "italic" } },
                    props.children
                  ),
              },
              {
                title: "Grassetto",
                value: "bold",
                icon: () => React.createElement("span", null, "B"),
                component: (props: { children: React.ReactNode }) =>
                  React.createElement(
                    "strong",
                    { style: { fontWeight: 700 } },
                    props.children
                  ),
              },
              {
                title: "Blue Bold",
                value: "blueBold",
                icon: () => React.createElement("span", null, "BB"),
                component: (props: { children: React.ReactNode }) =>
                  React.createElement(
                    "strong",
                    { style: { fontWeight: 700, color: "#3b82f6" } },
                    props.children
                  ),
              },
              {
                title: "Red Bold",
                value: "redBold",
                icon: () => React.createElement("span", null, "RB"),
                component: (props: { children: React.ReactNode }) =>
                  React.createElement(
                    "strong",
                    { style: { fontWeight: 700, color: "#dc143c" } },
                    props.children
                  ),
              },
              // Esempio: barra verticale (gradient) a sinistra che sposta l'indentazione
              {
                title: "Esempio (barra sx)",
                value: "exUnderline",
                icon: () =>
                  React.createElement(
                    "span",
                    {
                      style: {
                        display: "inline-block",
                        position: "relative",
                        paddingLeft: 6,
                      },
                    },
                    [
                      React.createElement("span", {
                        key: "bar",
                        "aria-hidden": true,
                        style: {
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 5,
                          backgroundImage:
                            "linear-gradient(180deg, #0ea5e9, #6366f1)",
                          borderRadius: 9999,
                        },
                      }),
                      "EX",
                    ]
                  ),
                component: (props: { children: React.ReactNode }) =>
                  React.createElement(
                    "span",
                    {
                      style: {
                        display: "inline-block",
                        position: "relative",
                        paddingLeft: 8,
                      },
                    },
                    [
                      React.createElement("span", {
                        key: "bar",
                        "aria-hidden": true,
                        style: {
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 6,
                          backgroundImage:
                            "linear-gradient(180deg, #0ea5e9, #6366f1)",
                          borderRadius: 9999,
                        },
                      }),
                      props.children,
                    ]
                  ),
              },
              // Evidenziatore blu (decorator) — visibile anche nello Studio
              {
                title: "Evidenziatore (giallo)",
                value: "highlightBlue",
                // Icona sensibile al tema (usa prefers-color-scheme)
                icon: () => {
                  const isDark =
                    typeof window !== "undefined" &&
                    typeof window.matchMedia === "function" &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches;
                  return React.createElement(
                    "span",
                    {
                      style: {
                        display: "inline-block",
                        padding: "0 4px",
                        borderRadius: 4,
                        backgroundColor: isDark
                          ? "rgba(250,204,21,.25)"
                          : "rgba(255,241,0,.92)",
                        color: "inherit",
                        fontWeight: 800,
                        lineHeight: 1.1,
                        WebkitBoxDecorationBreak: "clone",
                        boxDecorationBreak: "clone",
                        boxShadow: isDark
                          ? "inset 0 0 0 1px rgba(250,204,21,.30)"
                          : undefined,
                      },
                    },
                    "HL"
                  );
                },
                // Componente React (client) che si adatta al tema
                component: (props: { children: React.ReactNode }) => {
                  const [isDark, setIsDark] = React.useState(false);
                  React.useEffect(() => {
                    try {
                      const m = window.matchMedia(
                        "(prefers-color-scheme: dark)"
                      );
                      const onChange = () => setIsDark(m.matches);
                      onChange();
                      if (m.addEventListener)
                        m.addEventListener("change", onChange);
                      else m.addListener(onChange);
                      return () => {
                        if (m.removeEventListener)
                          m.removeEventListener("change", onChange);
                        else m.removeListener(onChange);
                      };
                    } catch {
                      // noop
                    }
                  }, []);
                  return React.createElement(
                    "span",
                    {
                      style: {
                        backgroundColor: isDark
                          ? "rgba(250,204,21,.25)"
                          : "rgba(255,241,0,.92)",
                        borderRadius: 4,
                        padding: "0.04em 0.26em",
                        WebkitBoxDecorationBreak: "clone",
                        boxDecorationBreak: "clone",
                        boxShadow: isDark
                          ? "inset 0 0 0 1px rgba(250,204,21,.30)"
                          : undefined,
                      },
                    },
                    props.children
                  );
                },
              },
              // Box blu per display math ($$...$$) selezionabile dall'editor
              {
                title: "Box blu (display $$)",
                value: "mathBlueBox",
                icon: () =>
                  React.createElement(
                    "span",
                    {
                      style: {
                        display: "inline-block",
                        padding: "0 6px",
                        borderRadius: 6,
                        backgroundColor: "#dbeafe", // bg-blue-100
                        color: "#1e3a8a", // blue-900
                        fontWeight: 800,
                        lineHeight: 1.1,
                      },
                    },
                    "∑"
                  ),
                component: (props: { children: React.ReactNode }) =>
                  React.createElement(
                    "span",
                    {
                      style: {
                        backgroundColor: "#dbeafe",
                        borderRadius: 6,
                        padding: "0 6px",
                        color: "inherit",
                      },
                    },
                    props.children
                  ),
              },
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
        { type: "horizontalRule" },
        { type: "lineBreak" },
        { type: "latex" },
        { type: "imageExternal" },
        { type: "section" },
        { type: "table" }, // ⬅️ abilitata la tabella (richiede plugin @sanity/table in sanity.config.ts)
      ],
    }),

    defineField({
      name: "resources",
      title: "Risorse",
      type: "object",
      fields: [
        { name: "formulario", title: "Link al formulario (PDF)", type: "url" },
        { name: "appunti", title: "Link agli appunti", type: "url" },
        { name: "videolezione", title: "Link alla videolezione", type: "url" },
      ],
    }),
    defineField({
      name: "lezioniPropedeuticheObbligatorie",
      title: "Lezioni obbligatorie da conoscere prima",
      type: "array",
      of: [{ type: "reference", to: [{ type: "lesson" }] }],
    }),
    defineField({
      name: "lezioniPropedeuticheOpzionali",
      title: "Lezioni consigliate (opzionali)",
      type: "array",
      of: [{ type: "reference", to: [{ type: "lesson" }] }],
    }),
    defineField({
      name: "thumbnailUrl",
      title: "Thumbnail link",
      type: "string",
    }),
    defineField({
      name: "difficolta",
      title: "Difficoltà",
      type: "string",
      validation: (Rule) => Rule.required(),
      options: {
        list: [
          { title: "Facile", value: "facile" },
          { title: "Intermedia", value: "intermedia" },
          { title: "Difficile", value: "difficile" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "categoria",
      title: "Categoria",
      type: "array",
      of: [{ type: "string" }],
      validation: (Rule) => Rule.required().min(1),
      options: {
        list: [
          { title: "Algebra", value: "Algebra" },
          { title: "Aritmetica", value: "Aritmetica" },
          { title: "Geometria analitica", value: "Geometria analitica" },
          { title: "Geometria euclidea", value: "Geometria euclidea" },
          { title: "Studio di funzione", value: "Studio di funzione" },
          { title: "Esponenziali", value: "Esponenziali" },
          { title: "Numeri complessi", value: "Numeri complessi" },
          { title: "Trigonometria", value: "Trigonometria" },
          {
            title: "Equazioni e disequazioni",
            value: "Equazioni e disequazioni",
          },
          {
            title: "Probabilità e statistica",
            value: "Probabilità e statistica",
          },
          { title: "Notazioni", value: "Notazioni" },
          { title: "Moti", value: "Moti" },
          { title: "Dinamica", value: "Dinamica" },
          { title: "Dinamica rotazionale", value: "Dinamica rotazionale" },
          { title: "Fluidi", value: "Fluidi" },
          { title: "Gravitazione", value: "Gravitazione" },
          { title: "Termodinamica", value: "Termodinamica" },
          { title: "Onde", value: "Onde" },
          { title: "Elettromagnetismo", value: "Elettromagnetismo" },
          { title: "Elettronica", value: "Elettronica" },
          { title: "Geometria medie", value: "Geometria medie" },
          { title: "Aritmetica medie", value: "Aritmetica medie" },
          { title: "Algebra medie", value: "Algebra medie" },
        ],
        layout: "list",
      },
    }),
    defineField({
      name: "classe",
      title: "Classi",
      type: "array",
      of: [{ type: "string" }],
      validation: (Rule) => Rule.required().min(1),
      options: {
        list: [
          { title: "1º Scientifico", value: "1º Scientifico" },
          { title: "2º Scientifico", value: "2º Scientifico" },
          { title: "3º Scientifico", value: "3º Scientifico" },
          { title: "4º Scientifico", value: "4º Scientifico" },
          { title: "5º Scientifico", value: "5º Scientifico" },
          { title: "1º Classico", value: "1º Classico" },
          { title: "2º Classico", value: "2º Classico" },
          { title: "3º Classico", value: "3º Classico" },
          { title: "4º Classico", value: "4º Classico" },
          { title: "5º Classico", value: "5º Classico" },
          { title: "1º Linguistico", value: "1º Linguistico" },
          { title: "2º Linguistico", value: "2º Linguistico" },
          { title: "3º Linguistico", value: "3º Linguistico" },
          { title: "4º Linguistico", value: "4º Linguistico" },
          { title: "5º Linguistico", value: "5º Linguistico" },
          { title: "1º Media", value: "1º Media" },
          { title: "2º Media", value: "2º Media" },
          { title: "3º Media", value: "3º Media" },
        ],
        layout: "list",
      },
    }),
    defineField({
      name: "esercizi",
      title: "Esercizi collegati",
      type: "array",
      of: [{ type: "reference", to: [{ type: "exercise" }] }],
    }),
    defineField({
      name: "lezioniFiglie",
      title: "Lezioni figlie (sotto-argomenti)",
      description:
        "Elenca qui le lezioni specifiche/figlie che dipendono da questa (es. sotto-punti dell'argomento).",
      type: "array",
      of: [{ type: "reference", to: [{ type: "lesson" }] }],
      options: { sortable: true },
    }),
  ],
});
