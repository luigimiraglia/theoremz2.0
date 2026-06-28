#!/usr/bin/env node
/**
 * generate-lesson.mjs
 *
 * Genera una lezione completa in 6 chiamate separate ad OpenAI (una per sezione),
 * converte il formato intermedio in Sanity Portable Text e opzionalmente la pusha.
 *
 * Usage:
 *   node scripts/generate-lesson.mjs           # preview JSON
 *   node scripts/generate-lesson.mjs --push    # push su Sanity e aggiorna queue
 *   node scripts/generate-lesson.mjs --slug asintoti --push
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { createClient } from "@sanity/client";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Clients ────────────────────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sanity = createClient({
  projectId: "0nqn5jl0",
  dataset: "production",
  useCdn: false,
  apiVersion: "2025-07-23",
  token: process.env.SANITY_TOKEN,
});

// ─── Zod schemas — intermediate format ──────────────────────────────────────

const Span = z.object({
  text: z.string(),
  marks: z.array(z.string()),
});

const TextBlock = z.object({
  type: z.literal("text"),
  spans: z.array(Span),
});

const SectionBlock = z.object({
  type: z.literal("section"),
  heading: z.string(),
  shortTitle: z.string().max(35),
});

const DisplayFormulaBlock = z.object({
  type: z.literal("displayFormula"),
  latex: z.string(),
});

const ImagePlaceholderBlock = z.object({
  type: z.literal("imagePlaceholder"),
  description: z.string(),
});

const HorizontalRuleBlock = z.object({
  type: z.literal("horizontalRule"),
});

// EsempioBlock can appear inline inside content sections too
const EsempioContentBlock = z.discriminatedUnion("type", [
  TextBlock,
  DisplayFormulaBlock,
  ImagePlaceholderBlock,
]);

const ContentBlock = z.discriminatedUnion("type", [
  TextBlock,
  SectionBlock,
  DisplayFormulaBlock,
  ImagePlaceholderBlock,
  HorizontalRuleBlock,
  z.object({
    type: z.literal("esempioBlock"),
    title: z.string(),
    blocks: z.array(EsempioContentBlock).min(3),
  }),
]);

const FormulaFlashcard = z.object({
  title: z.string().max(80),
  formula: z.string(),
  explanation: z.string().max(150),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

// ─── Per-section response schemas ───────────────────────────────────────────

// Section 1 — Riepilogo veloce
const ClasseEnum = z.enum([
  "1º Media", "2º Media", "3º Media",
  "1º Scientifico", "2º Scientifico", "3º Scientifico", "4º Scientifico", "5º Scientifico",
  "1º Classico", "2º Classico", "3º Classico", "4º Classico", "5º Classico",
  "1º Linguistico", "2º Linguistico", "3º Linguistico", "4º Linguistico", "5º Linguistico",
  "1º Scienze Umane", "2º Scienze Umane", "3º Scienze Umane", "4º Scienze Umane", "5º Scienze Umane",
  "1º Tecnologico", "2º Tecnologico", "3º Tecnologico", "4º Tecnologico", "5º Tecnologico",
]);

const RiepilogoResponse = z.object({
  subtitle: z.string(),
  nomeAbbreviato: z.string().max(30),
  classe: z.array(ClasseEnum).min(1).max(12),
  riepilogo: z.object({
    titolo: z.string(),
    definizione: z.string(),
    formulaPrincipale: z.string().nullable(),
    puntiChiave: z.array(z.string()).min(3).max(6),
  }),
});

// Section 2 — Schema/Tabella rapida
const SchemaRapidoResponse = z.object({
  caption: z.string(),
  headers: z.array(z.string()).min(2).max(4),
  rows: z.array(z.object({
    cells: z.array(z.string()).min(2).max(4),
  })).min(2).max(12),
});

// Sections 3 and 4 (Analisi, Formule): standard content blocks
const SectionResponse = z.object({
  content: z.array(ContentBlock).min(8),
});

// Section 4 — Formule e proprietà: content + flashcards
const Section3Response = z.object({
  content: z.array(ContentBlock).min(10),
  formule: z.array(FormulaFlashcard).min(3).max(6),
});

// Section 5 — Esempi svolti
const EsempioItem = z.object({
  title: z.string(),
  blocks: z.array(EsempioContentBlock).min(4),
});

const Section5EsempiResponse = z.object({
  sectionHeading: z.string(),
  sectionShortTitle: z.string().max(35),
  esempi: z.array(EsempioItem).min(3).max(5),
});

// Section 6 — Errori comuni
const ErrorItem = z.object({
  wrong: z.string(),
  correct: z.string(),
  explanation: z.string(),
});

const Section6ErroriResponse = z.object({
  sectionHeading: z.string(),
  sectionShortTitle: z.string().max(35),
  items: z.array(ErrorItem).min(4).max(6),
});

// Section 7 — FAQ
const FaqAnswerBlock = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), spans: z.array(Span) }),
  z.object({ type: z.literal("displayFormula"), latex: z.string() }),
]);

const FaqItem = z.object({
  question: z.string(),
  answerBlocks: z.array(FaqAnswerBlock).min(1).max(5),
});

const Section7FaqResponse = z.object({
  sectionHeading: z.string(),
  sectionShortTitle: z.string().max(35),
  items: z.array(FaqItem).min(5).max(7),
});

// Section 8 — Flashcard concettuali (same shape as FormulaFlashcard)
const Section8FlashcardsResponse = z.object({
  cards: z.array(FormulaFlashcard).min(5).max(10),
});

// ─── Section specifications ──────────────────────────────────────────────────

const SECTION_SPECS = [
  { index: 0, type: "riepilogo",    label: "Sezione 1 — Riepilogo veloce",      schema: RiepilogoResponse,          schemaName: "section1",    minBlocks: null },
  { index: 1, type: "schema",       label: "Sezione 2 — Schema/Tabella rapida", schema: SchemaRapidoResponse,       schemaName: "section2",    minBlocks: null },
  { index: 2, type: "content",      label: "Sezione 3 — Spiegazione completa",  schema: SectionResponse,            schemaName: "section",     minBlocks: 20 },
  { index: 3, type: "content",      label: "Sezione 4 — Formule e proprietà",   schema: Section3Response,           schemaName: "section3",    minBlocks: 10 },
  { index: 4, type: "esempi",       label: "Sezione 5 — Esempi svolti",         schema: Section5EsempiResponse,     schemaName: "section5",    minBlocks: null },
  { index: 5, type: "erroriComuni", label: "Sezione 6 — Errori comuni",         schema: Section6ErroriResponse,     schemaName: "section6",    minBlocks: null },
  { index: 6, type: "faq",          label: "Sezione 7 — Domande frequenti",     schema: Section7FaqResponse,        schemaName: "section7",    minBlocks: null },
  { index: 7, type: "flashcards",   label: "Sezione 8 — Flashcard",             schema: Section8FlashcardsResponse, schemaName: "section8",    minBlocks: null },
];

// Brief description of what each section covers (for context in subsequent calls)
const SECTION_SUMMARY_LABELS = [
  "riepilogo veloce: definizione sintetica, formula principale, punti chiave",
  "schema/tabella riassuntiva delle formule o proprietà principali",
  "spiegazione completa dall'inizio: derivazioni, casi speciali, proprietà, dimostrazioni",
  "raccolta completa delle formule con esempi numerici passo-passo",
  "esempi svolti completamente risolti (almeno 3)",
  "errori comuni e correzioni",
  "domande frequenti con risposte dirette",
  "flashcard concettuali (definizioni, teoremi, casi, applicazioni)",
];

// ─── User prompt builders ────────────────────────────────────────────────────

function buildSectionPrompt(sectionIndex, lesson, coveredTopics) {
  const meta = `Materia: ${lesson.materia} | Difficoltà: ${lesson.difficolta}
Classi: ${lesson.classe.join(", ")}
Categorie: ${lesson.categoria.join(", ")}

Query principali (ottimizza il contenuto per queste ricerche):
${lesson.queryPrincipali.map((q) => `- ${q}`).join("\n")}

Domande frequenti da rispondere nel testo:
${lesson.domandeVeloci.map((q) => `- ${q}`).join("\n")}

Argomenti da coprire nell'intera lezione:
${lesson.argomenti.map((a) => `- ${a}`).join("\n")}${
    coveredTopics.length > 0
      ? `\n\nGià trattato nelle sezioni precedenti (non ripetere):\n${coveredTopics.map((t) => `- ${t}`).join("\n")}`
      : ""
  }`;

  switch (sectionIndex) {
    case 0:
      return `Genera il RIEPILOGO VELOCE della lezione su: **${lesson.title}**

${meta}

Questa sezione è una card "a colpo d'occhio" visibile in cima alla lezione.
Deve essere estremamente sintetica e chiara — leggibile in 30 secondi.

Restituisci:
- subtitle: 4–8 parole che descrivono cosa impara lo studente (es. "Definizione, condizioni e calcolo della continuità")
- nomeAbbreviato: etichetta breve max 30 caratteri per la ricerca
- classe: array delle classi del curriculum italiano in cui questo argomento viene effettivamente insegnato.
  Valori esatti consentiti (usa SOLO questi): "1º Media", "2º Media", "3º Media", "1º Scientifico", "2º Scientifico", "3º Scientifico", "4º Scientifico", "5º Scientifico", "1º Classico", "2º Classico", "3º Classico", "4º Classico", "5º Classico", "1º Linguistico", "2º Linguistico", "3º Linguistico", "4º Linguistico", "5º Linguistico", "1º Scienze Umane", "2º Scienze Umane", "3º Scienze Umane", "4º Scienze Umane", "5º Scienze Umane", "1º Tecnologico", "2º Tecnologico", "3º Tecnologico", "4º Tecnologico", "5º Tecnologico".
  Indica SOLO le classi dove questo specifico argomento è effettivamente in programma secondo il curriculum italiano. Non mettere classi dove l'argomento non viene insegnato.
- riepilogo:
  - titolo: titolo del riepilogo (es. "La continuità di una funzione"). NON aggiungere "— in breve" o formule simili.
  - definizione: 1–2 frasi precise che definiscono il concetto. Usa terminologia corretta.
  - formulaPrincipale: formula/relazione principale in LaTeX SENZA delimitatori. Ometti se non c'è una formula chiave centrale.
  - puntiChiave: 3–5 stringhe concise. Ciascuna inizia con una keyword seguita da ": spiegazione breve". Possono contenere $...$ per LaTeX inline.`;

    case 1:
      return `Genera lo SCHEMA/TABELLA RAPIDA della lezione su: **${lesson.title}**

${meta}

Questa sezione è una tabella riassuntiva visibile subito dopo il riepilogo veloce.
Adatta il tipo di schema all'argomento:
- Per lezioni con formule: tabella [Formula/Proprietà, Significato, Condizioni/Note]
- Per geometria: tabella [Elemento, Proprietà, Formula]
- Per analisi/funzioni: tabella [Caso, Condizione, Risultato/Comportamento]
- Per fisica: tabella [Grandezza, Simbolo, Formula, Unità SI]
- Per definizioni: tabella [Concetto, Definizione, Esempio]

Restituisci:
- caption: titolo della tabella (es. "Formule della continuità", "Proprietà del cilindro", "Casi di discontinuità")
- headers: array di 2–4 intestazioni di colonna. Brevi, chiare.
- rows: 3–10 righe. Ogni riga ha lo stesso numero di celle delle intestazioni. Le celle possono contenere $...$ per LaTeX inline.

Non includere celle vuote. Sii preciso e completo.`;

    case 2:
      return `Genera la SEZIONE 3 — SPIEGAZIONE COMPLETA della lezione su: **${lesson.title}**

${meta}

Requisiti minimi: 20 content blocks, 15 text blocks non vuoti.

STRUTTURA DEI BLOCCHI SECTION:
- Il PRIMO blocco è SEMPRE un \`section\` block con il titolo principale della sezione.
- Per argomenti che hanno sotto-categorie distinte (tipi, casi, varianti), usa un blocco \`section\` separato per CIASCUNA sotto-categoria, con heading e shortTitle dedicati. Esempio: se l'argomento ha 3 tipi di discontinuità, usa 4 section block: uno introduttivo + uno per tipo.
- Per argomenti lineari senza sotto-categorie, un singolo \`section\` iniziale è sufficiente.

TONO E ACCESSIBILITÀ:
- Scrivi come un professore che spiega a un ragazzo di 16 anni alle prese con questo concetto per la prima volta.
- Usa analogie concrete quando possibile (es. "pensala come se...") per motivare ogni concetto.
- Spiega SEMPRE il PERCHÉ prima del COME: prima la motivazione o l'intuizione, poi la definizione formale.
- Il tono resta rigoroso e impersonale ("si osserva", "si dimostra") ma le frasi devono essere brevi e accessibili.
- NON saltare passaggi dando per scontato che lo studente li conosca.

Struttura dei contenuti:
1. Paragrafo introduttivo: perché questo concetto esiste, a che problema risponde
2. Per ogni sotto-argomento dell'elenco (ordine logico, difficoltà crescente):
   - Nuovo blocco \`section\` con il nome del sotto-argomento (se ha senso come sezione navigabile)
   - Intuizione o analogia prima della definizione formale
   - Definizione formale + \`displayFormula\` con la relazione principale
   - Esempio numerico: per quelli brevi (1–2 passi) usa text block; per quelli articolati (3+ passi) usa \`esempioBlock\` inline
3. Derivazione o dimostrazione dove applicabile (ogni passaggio come \`displayFormula\`)
4. Casi particolari, eccezioni, condizioni di validità
5. Almeno 1 \`imagePlaceholder\` con descrizione dettagliata (grafico, schema, diagramma con etichette)

NON ripetere la definizione sintetica già nel "Concetto chiave" in cima. Parti da lì e approfondisci.`;

    case 3:
      return `Genera la SEZIONE 4 — FORMULE E PROPRIETÀ della lezione su: **${lesson.title}**

${meta}

Requisiti minimi: 10 content blocks.
Il primo blocco deve essere un \`section\` block.

Struttura richiesta:
1. Blocco \`section\` con heading "Formule e proprietà" (o adatto) e shortTitle
2. Per ogni formula rilevante:
   - \`displayFormula\` con la formula
   - 1–2 text blocks: spiegazione simboli con inlineLatex
   - Esempio numerico come esempioBlock inline:
     { "type": "esempioBlock", "title": "Esempio — [descrizione]", "blocks": [...min 3 blocchi...] }
3. Per la fisica: unità di misura con inlineLatex per ogni grandezza
4. Varianti utili, forme inverse, casi speciali

Restituisci anche i flashcard nel campo \`formule\` (3–6 card):
- formula: LaTeX senza delimitatori (niente $$, \\[, \\()
- explanation: max 150 caratteri, italiano`;

    case 4:
      return `Genera la SEZIONE 5 — ESEMPI SVOLTI della lezione su: **${lesson.title}**

${meta}

Questa sezione è una serie di card di esercizi completamente risolti.
Restituisci:
- sectionHeading: titolo (es. "Esempi svolti")
- sectionShortTitle: max 35 caratteri
- esempi: 3–5 oggetti, ciascuno con:
  - title: titolo (es. "Esempio 1 — Verifica della continuità in un punto")
  - blocks: almeno 6 blocchi con la soluzione completa:
    - { "type": "text", "spans": [{ "text": "...", "marks": ["exUnderline"] }] } — enunciato
    - ${lesson.materia === "fisica" ? '{ "type": "imagePlaceholder", "description": "..." } — diagramma obbligatorio' : '{ "type": "imagePlaceholder", "description": "..." } — se geometricamente utile'}
    - 2 text blocks: analisi (dati, incognita, metodo)
    - 3–5 text blocks + displayFormula: soluzione passo-passo con calcoli in inlineLatex
    - 1 text block: risultato finale in blueBold
    - 1 text block: errore tipico con redBold

Gli esempi devono testare aspetti diversi dell'argomento (difficoltà crescente).`;

    case 5:
      return `Genera la SEZIONE 6 — ERRORI COMUNI della lezione su: **${lesson.title}**

${meta}

Questa sezione è una lista di card visivamente distinte (non testo normale).
Restituisci:
- sectionHeading: titolo (es. "Errori comuni")
- sectionShortTitle: max 35 caratteri
- items: 4–6 oggetti, ciascuno con:
  - wrong: errore specifico (può contenere $...$)
  - correct: correzione (può contenere $...$)
  - explanation: 1–3 frasi che spiegano perché avviene e come evitarlo

Errori specifici per ${lesson.title} (non generici):
${lesson.domandeVeloci.map((d) => `- Errore legato a: "${d}"`).join("\n")}`;

    case 6:
      return `Genera la SEZIONE 7 — DOMANDE FREQUENTI della lezione su: **${lesson.title}**

${meta}

Questa sezione è un accordion espandibile (non testo normale).
Restituisci:
- sectionHeading: titolo (es. "Domande frequenti")
- sectionShortTitle: max 35 caratteri
- items: 5–7 oggetti, ciascuno con:
  - question: domanda come la scriverebbe uno studente su Google (può contenere $...$)
  - answerBlocks: 1–4 blocchi:
    - { "type": "text", "spans": [{ "text": "...", "marks": [] }] }
    - { "type": "displayFormula", "latex": "..." }  (senza $$)
    La PRIMA frase del primo answerBlock deve essere la risposta diretta.

Domande obbligatorie:
${lesson.domandeVeloci.map((d, i) => `${i + 1}. "${d}"`).join("\n")}
${lesson.domandeVeloci.length < 5 ? "(aggiungi domande extra fino ad averne almeno 5)" : ""}`;

    case 7:
      return `Genera le FLASHCARD CONCETTUALI della lezione su: **${lesson.title}**

${meta}

Queste flashcard vengono mostrate agli studenti in modalità studio separata dalla lezione.
Ogni card ha: fronte (title) → retro (formula LaTeX + explanation).

Genera 5–10 card che coprono i CONCETTI CHIAVE dell'argomento, NON solo le formule matematiche già presenti nella lezione. Includi:
- Definizioni: "Definizione di [termine chiave]" → formula che la esprime + spiegazione
- Teoremi e proprietà: "Quando vale [teorema]?" → condizione in LaTeX + significato
- Casi distinti: "[Tipo X] — come si riconosce?" → caratteristica in LaTeX + differenza dagli altri casi
- Applicazioni: "Come si verifica [proprietà]?" → metodo/formula + esempio sintetico
- Errori frequenti: "Attenzione: [caso comune sbagliato]" → formula corretta + perché si sbaglia

Regole:
- title: domanda o etichetta concisa (max 70 caratteri, italiano)
- formula: espressione LaTeX SENZA delimitatori che caratterizza il concetto (non copiare esattamente le formule già nelle flashcard precedenti)
- explanation: spiegazione in italiano, max 140 caratteri
- difficulty: 1 = definizione base, 2 = proprietà/caso, 3 = applicazione avanzata

Flashcard formula già generate nella Sezione 4 (NON duplicare):
${lesson.argomenti.map((a) => `- ${a}`).join("\n")}`;
  }
}

// ─── Post-processor: intermediate → Sanity Portable Text ────────────────────

function key() {
  return Math.random().toString(36).slice(2, 11);
}

/** Strip LaTeX delimiters that the AI might incorrectly include */
function sanitizeLatex(s) {
  return (s ?? "")
    .replace(/^\\\(|\\\)$/g, "")
    .replace(/^\\\[|\\\]$/g, "")
    .replace(/^\$\$|\$\$$/g, "")
    .replace(/^\$|\$$/g, "")
    .trim();
}

function spacer() {
  return {
    _type: "block",
    _key: key(),
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: key(), text: "", marks: [] }],
  };
}

function convertTextBlock(block) {
  const markDefs = [];
  const children = [];

  for (const span of block.spans) {
    const spanKey = key();
    const marks = [...span.marks];

    if (marks.includes("inlineLatex")) {
      const defKey = key();
      markDefs.push({ _key: defKey, _type: "inlineLatex", code: sanitizeLatex(span.text) });
      marks[marks.indexOf("inlineLatex")] = defKey;
    }

    children.push({ _type: "span", _key: spanKey, text: span.text, marks });
  }

  return { _type: "block", _key: key(), style: "normal", markDefs, children };
}

function convertEsempioContent(blocks) {
  const out = [];
  for (const block of blocks) {
    if (out.length > 0) out.push(spacer());
    if (block.type === "text") {
      out.push(convertTextBlock(block));
    } else if (block.type === "displayFormula") {
      out.push({ _type: "latex", _key: key(), code: sanitizeLatex(block.latex), display: true });
    } else if (block.type === "imagePlaceholder") {
      out.push({
        _type: "block",
        _key: key(),
        style: "normal",
        markDefs: [],
        children: [{ _type: "span", _key: key(), text: `📌 [IMMAGINE: ${block.description}]`, marks: ["redBold"] }],
      });
    }
  }
  return out;
}

function toSanityBlocks(content) {
  const out = [];

  for (const block of content) {
    // HR before section dividers and special terminal blocks (errori/faq)
    // riepilogoBlock and schemaRapidoBlock sit at the top — no HR before them
    if (block.type === "section" || block.type === "erroriComuniBlock" || block.type === "faqBlock") {
      if (out.length > 0) {
        out.push({ _type: "horizontalRule", _key: key() });
      }
    } else if (out.length > 0) {
      out.push(spacer());
    }

    switch (block.type) {
      case "text":
        out.push(convertTextBlock(block));
        break;

      case "section":
        out.push({
          _type: "section",
          _key: key(),
          heading: block.heading,
          shortTitle: block.shortTitle,
        });
        break;

      case "displayFormula":
        out.push({
          _type: "latex",
          _key: key(),
          code: sanitizeLatex(block.latex),
          display: true,
        });
        break;

      case "imagePlaceholder":
        out.push({
          _type: "block",
          _key: key(),
          style: "normal",
          markDefs: [],
          children: [
            {
              _type: "span",
              _key: key(),
              text: `📌 [IMMAGINE: ${block.description}]`,
              marks: ["redBold"],
            },
          ],
        });
        break;

      case "horizontalRule":
        out.push({ _type: "horizontalRule", _key: key() });
        break;

      case "riepilogoBlock":
        out.push({
          _type: "riepilogoBlock",
          _key: key(),
          titolo: block.titolo,
          definizione: block.definizione,
          formulaPrincipale: block.formulaPrincipale ?? null,
          puntiChiave: (block.puntiChiave ?? []).map((t) => ({ _key: key(), testo: t })),
        });
        break;

      case "schemaRapidoBlock":
        out.push({
          _type: "schemaRapidoBlock",
          _key: key(),
          caption: block.caption,
          headers: block.headers,
          rows: (block.rows ?? []).map((r) => ({
            _key: key(),
            cells: r.cells,
          })),
        });
        break;

      case "esempioBlock":
        out.push({
          _type: "esempioBlock",
          _key: key(),
          title: block.title,
          content: convertEsempioContent(block.blocks),
        });
        break;

      case "erroriComuniBlock":
        out.push({
          _type: "erroriComuniBlock",
          _key: key(),
          heading: block.heading,
          items: block.items.map((item) => ({
            _key: key(),
            wrong: item.wrong,
            correct: item.correct,
            explanation: item.explanation,
          })),
        });
        break;

      case "faqBlock":
        out.push({
          _type: "faqBlock",
          _key: key(),
          heading: block.heading,
          items: block.items.map((item) => ({
            _key: key(),
            question: item.question,
            answer: convertFaqAnswerBlocks(item.answerBlocks),
          })),
        });
        break;
    }
  }

  return out;
}

function convertFaqAnswerBlocks(blocks) {
  const out = [];
  for (const block of blocks) {
    if (out.length > 0) out.push(spacer());
    if (block.type === "text") {
      out.push(convertTextBlock(block));
    } else if (block.type === "displayFormula") {
      out.push({ _type: "latex", _key: key(), code: sanitizeLatex(block.latex), display: true });
    }
  }
  return out;
}

// ─── Validators ──────────────────────────────────────────────────────────────

function validateContentSection(content, spec) {
  const total = content.length;
  const sections = content.filter((b) => b.type === "section").length;
  const errors = [];

  if (total < spec.minBlocks)
    errors.push(`${total} blocchi (minimo ${spec.minBlocks})`);
  // Sections 3 and 4 can have multiple section blocks (one per sub-topic); others need exactly 1
  const multiSection = spec.index === 2 || spec.index === 3;
  const maxSections = multiSection ? 10 : 1;
  if (sections < 1 || sections > maxSections)
    errors.push(`trovati ${sections} section block${multiSection ? " (minimo 1, possono essere più di uno)" : " (ne serve esattamente 1)"}`);

  return errors;
}

function validate(lesson) {
  const content = lesson.content;

  // Flatten to count blocks nested inside esempioBlock items
  const allBlocks = content.flatMap((b) =>
    b.type === "esempioBlock" ? [b, ...b.blocks] : [b],
  );

  const total = allBlocks.length;
  const nonEmpty = allBlocks.filter(
    (b) => b.type === "text" && b.spans.some((s) => s.text.trim() !== ""),
  ).length;
  // Sections 3-5 each produce one section block; others embed heading in special block
  const sections = content.filter((b) => b.type === "section").length;
  const esempi = content.filter((b) => b.type === "esempioBlock").length;
  const images = allBlocks.filter((b) => b.type === "imagePlaceholder").length;
  const hasRiepilogo = content.some((b) => b.type === "riepilogoBlock");
  const hasSchema = content.some((b) => b.type === "schemaRapidoBlock");

  const errors = [];
  if (total < 50)
    errors.push(`Lezione troppo corta: ${total} blocchi totali (minimo 50)`);
  if (nonEmpty < 30)
    errors.push(`Troppo pochi testi: ${nonEmpty} non vuoti (minimo 30)`);
  if (sections < 3)
    errors.push(`Troppo poche sezioni: ${sections} (minimo 3: una per spiegazione, formule ed esempi)`);
  if (esempi < 3)
    errors.push(`Troppo pochi esempi: ${esempi} (minimo 3)`);
  if (!hasRiepilogo)
    errors.push("Manca il riepilogoBlock");
  if (!hasSchema)
    errors.push("Manca lo schemaRapidoBlock");
  if (images > 10)
    errors.push(`Troppe immagini: ${images} (massimo 10)`);

  return errors;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const shouldPush = args.includes("--push");
  const slugArg = args.includes("--slug")
    ? args[args.indexOf("--slug") + 1]
    : null;

  // Load queue
  const queuePath = path.join(__dirname, "lesson-queue.json");
  const queue = JSON.parse(readFileSync(queuePath, "utf8"));

  const lesson = slugArg
    ? queue.find((l) => l.slug === slugArg)
    : queue.find((l) => l.status === "pending" && l.tier === 1);

  if (!lesson) {
    console.error(
      slugArg
        ? `Lezione "${slugArg}" non trovata in lesson-queue.json`
        : "Nessuna lezione tier-1 pending",
    );
    process.exit(1);
  }

  console.log(`\n🎓 Genero: ${lesson.title}`);
  console.log(
    `   Slug: ${lesson.slug} | ${lesson.materia} | ${lesson.difficolta}\n`,
  );

  const systemPrompt = readFileSync(
    path.join(__dirname, "lesson-instructions.md"),
    "utf8",
  );

  // ─── Generate sections sequentially ───────────────────────────────────────

  const allContent = [];
  const coveredTopics = [];
  let subtitle, nomeAbbreviato, formule, classeGenerata;

  for (const spec of SECTION_SPECS) {
    console.log(`⏳ ${spec.label}...`);

    const userPrompt = buildSectionPrompt(spec.index, lesson, coveredTopics);

    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: zodResponseFormat(spec.schema, spec.schemaName),
    });

    const raw = response.choices[0].message.content;
    const parsed = spec.schema.parse(JSON.parse(raw));

    if (spec.type === "riepilogo") {
      subtitle = parsed.subtitle;
      nomeAbbreviato = parsed.nomeAbbreviato;
      classeGenerata = parsed.classe;
      allContent.push({ type: "riepilogoBlock", ...parsed.riepilogo });
      coveredTopics.push(SECTION_SUMMARY_LABELS[spec.index]);
      console.log(`✅ ${spec.label}: ${parsed.riepilogo.puntiChiave.length} punti chiave | classi: ${parsed.classe.join(", ")}`);

    } else if (spec.type === "schema") {
      allContent.push({
        type: "schemaRapidoBlock",
        caption: parsed.caption,
        headers: parsed.headers,
        rows: parsed.rows,
      });
      coveredTopics.push(SECTION_SUMMARY_LABELS[spec.index]);
      console.log(`✅ ${spec.label}: ${parsed.rows.length} righe`);

    } else if (spec.type === "erroriComuni") {
      allContent.push({
        type: "erroriComuniBlock",
        heading: parsed.sectionHeading,
        items: parsed.items,
      });
      coveredTopics.push(SECTION_SUMMARY_LABELS[spec.index]);
      console.log(`✅ ${spec.label}: ${parsed.items.length} errori`);

    } else if (spec.type === "faq") {
      allContent.push({
        type: "faqBlock",
        heading: parsed.sectionHeading,
        items: parsed.items,
      });
      coveredTopics.push(SECTION_SUMMARY_LABELS[spec.index]);
      console.log(`✅ ${spec.label}: ${parsed.items.length} domande`);

    } else if (spec.type === "flashcards") {
      // Merge concept cards into the formule array (same structure, same API/frontend)
      formule = [...(formule ?? []), ...parsed.cards];
      coveredTopics.push(SECTION_SUMMARY_LABELS[spec.index]);
      console.log(`✅ ${spec.label}: ${parsed.cards.length} card concettuali (totale: ${formule.length})`);

    } else if (spec.type === "esempi") {
      allContent.push({
        type: "section",
        heading: parsed.sectionHeading,
        shortTitle: parsed.sectionShortTitle,
      });
      for (const esempio of parsed.esempi) {
        allContent.push({ type: "esempioBlock", title: esempio.title, blocks: esempio.blocks });
      }
      coveredTopics.push(SECTION_SUMMARY_LABELS[spec.index]);
      console.log(`✅ ${spec.label}: ${parsed.esempi.length} esempi`);

    } else {
      // Content sections (Analisi dettagliata, Formule e proprietà)
      if (spec.index === 3) {
        formule = parsed.formule;
      }

      const sectionErrors = validateContentSection(parsed.content, spec);
      if (sectionErrors.length) {
        console.error(`\n❌ ${spec.label} non valida:`);
        sectionErrors.forEach((e) => console.error(`   • ${e}`));
        writeFileSync(
          "/tmp/lesson-section-error.json",
          JSON.stringify(parsed, null, 2),
        );
        console.error("   JSON salvato in /tmp/lesson-section-error.json\n");
        process.exit(1);
      }

      allContent.push(...parsed.content);
      coveredTopics.push(SECTION_SUMMARY_LABELS[spec.index]);
      console.log(`✅ ${spec.label}: ${parsed.content.length} blocchi`);
    }
  }

  // ─── Build combined intermediate ──────────────────────────────────────────

  const intermediate = {
    title: lesson.title,
    subtitle,
    nomeAbbreviato,
    materia: lesson.materia,
    difficolta: lesson.difficolta,
    slug: lesson.slug,
    categoria: lesson.categoria,
    classe: classeGenerata ?? lesson.classe,
    content: allContent,
    formule: formule ?? [],
  };

  // ─── Validate full lesson ──────────────────────────────────────────────────

  const errors = validate(intermediate);
  if (errors.length) {
    console.error("\n❌ Validazione finale fallita:");
    errors.forEach((e) => console.error(`   • ${e}`));
    writeFileSync(
      "/tmp/lesson-intermediate.json",
      JSON.stringify(intermediate, null, 2),
    );
    console.error("\nJSON salvato in /tmp/lesson-intermediate.json per debug\n");
    process.exit(1);
  }

  const allBlocksFlat = intermediate.content.flatMap((b) =>
    b.type === "esempioBlock" ? [b, ...b.blocks] : [b],
  );
  const total = allBlocksFlat.length;
  const sections = intermediate.content.filter((b) => b.type === "section").length;
  const esempi = intermediate.content.filter((b) => b.type === "esempioBlock").length;
  const images = allBlocksFlat.filter((b) => b.type === "imagePlaceholder").length;
  const formulas = allBlocksFlat.filter((b) => b.type === "displayFormula").length;
  const erroriCount = intermediate.content.find((b) => b.type === "erroriComuniBlock")?.items?.length ?? 0;
  const faqCount = intermediate.content.find((b) => b.type === "faqBlock")?.items?.length ?? 0;
  console.log(
    `\n✅ Validazione OK: ${total} blocchi | ${sections} sezioni | ${esempi} esempi | ${formulas} formule | ${erroriCount} errori | ${faqCount} FAQ | ${intermediate.formule.length} flashcard`,
  );

  // ─── Convert to Sanity ─────────────────────────────────────────────────────

  const sanityContent = toSanityBlocks(intermediate.content);

  const doc = {
    _type: "lesson",
    title: intermediate.title,
    subtitle: intermediate.subtitle,
    nomeAbbreviato: intermediate.nomeAbbreviato,
    materia: intermediate.materia,
    difficolta: intermediate.difficolta,
    slug: { _type: "slug", current: intermediate.slug },
    categoria: intermediate.categoria,
    classe: intermediate.classe,
    content: sanityContent,
    formule: intermediate.formule,
  };

  if (!shouldPush) {
    const outPath = path.join(__dirname, `lesson-preview-${lesson.slug}.json`);
    writeFileSync(outPath, JSON.stringify(doc, null, 2));
    console.log(
      `\n📄 Preview salvata in: scripts/lesson-preview-${lesson.slug}.json`,
    );
    console.log("   Rilancia con --push per pushare su Sanity.\n");
    return;
  }

  // Use slug as deterministic _id
  doc._id = intermediate.slug;

  console.log("\n🚀 Push su Sanity...");
  const result = await sanity.createOrReplace(doc);
  console.log(`✅ Lezione salvata: ${result._id}`);
  console.log(
    `   https://www.sanity.io/manage/personal/project/0nqn5jl0/content;${result._id}`,
  );

  if (lesson.status === "pending") {
    lesson.status = "done";
    writeFileSync(queuePath, JSON.stringify(queue, null, 2));
    console.log("   lesson-queue.json aggiornato.\n");
  } else {
    console.log("   (status già done — lesson-queue.json invariato)\n");
  }
}

main().catch((err) => {
  console.error("\n💥 Errore:", err.message);
  process.exit(1);
});
