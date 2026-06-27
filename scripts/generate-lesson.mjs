#!/usr/bin/env node
/**
 * generate-lesson.mjs
 *
 * Legge la prima lezione tier-1 pending da lesson-queue.json,
 * la genera via OpenAI usando lesson-instructions.md come system prompt,
 * converte il formato intermedio in Sanity Portable Text, e opzionalmente la pusha.
 *
 * Usage:
 *   node scripts/generate-lesson.mjs           # preview JSON
 *   node scripts/generate-lesson.mjs --push    # push su Sanity e aggiorna queue
 *   node scripts/generate-lesson.mjs --slug asintoti --push  # lezione specifica
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { createClient } from '@sanity/client';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Clients ────────────────────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sanity = createClient({
  projectId: '0nqn5jl0',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2025-07-23',
  token: process.env.SANITY_TOKEN,
});

// ─── Zod schema — intermediate format ───────────────────────────────────────

const Span = z.object({
  text: z.string(),
  marks: z.array(z.string()),
});

const TextBlock = z.object({
  type: z.literal('text'),
  spans: z.array(Span),
});

const SectionBlock = z.object({
  type: z.literal('section'),
  heading: z.string(),
  shortTitle: z.string().max(35),
});

const DisplayFormulaBlock = z.object({
  type: z.literal('displayFormula'),
  latex: z.string(),
});

const ImagePlaceholderBlock = z.object({
  type: z.literal('imagePlaceholder'),
  description: z.string(),
});

const HorizontalRuleBlock = z.object({
  type: z.literal('horizontalRule'),
});

const ContentBlock = z.discriminatedUnion('type', [
  TextBlock,
  SectionBlock,
  DisplayFormulaBlock,
  ImagePlaceholderBlock,
  HorizontalRuleBlock,
]);

const LessonIntermediate = z.object({
  title: z.string(),
  subtitle: z.string(),
  nomeAbbreviato: z.string().max(30),
  materia: z.enum(['matematica', 'fisica']),
  difficolta: z.enum(['facile', 'intermedia', 'difficile']),
  slug: z.string(),
  categoria: z.array(z.string()).min(1).max(3),
  classe: z.array(z.string()),
  content: z.array(ContentBlock).min(35),
});

// ─── Post-processor: intermediate → Sanity Portable Text ────────────────────

function key() {
  return Math.random().toString(36).slice(2, 11);
}

function spacer() {
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text: '', marks: [] }],
  };
}

function convertTextBlock(block) {
  const markDefs = [];
  const children = [];

  for (const span of block.spans) {
    const spanKey = key();
    const marks = [...span.marks];

    if (marks.includes('inlineLatex')) {
      const defKey = key();
      markDefs.push({ _key: defKey, _type: 'inlineLatex', code: span.text });
      marks[marks.indexOf('inlineLatex')] = defKey;
    }

    children.push({ _type: 'span', _key: spanKey, text: span.text, marks });
  }

  return { _type: 'block', _key: key(), style: 'normal', markDefs, children };
}

function toSanityBlocks(content) {
  const out = [];

  for (const block of content) {
    if (out.length > 0) out.push(spacer());

    switch (block.type) {
      case 'text':
        out.push(convertTextBlock(block));
        break;

      case 'section':
        out.push({
          _type: 'section',
          _key: key(),
          heading: block.heading,
          shortTitle: block.shortTitle,
        });
        break;

      case 'displayFormula':
        out.push({
          _type: 'latex',
          _key: key(),
          code: block.latex,
          display: false,
        });
        break;

      case 'imagePlaceholder':
        out.push({
          _type: 'block',
          _key: key(),
          style: 'normal',
          markDefs: [],
          children: [{
            _type: 'span',
            _key: key(),
            text: `📌 [IMMAGINE: ${block.description}]`,
            marks: ['redBold'],
          }],
        });
        break;

      case 'horizontalRule':
        out.push({ _type: 'horizontalRule', _key: key() });
        break;
    }
  }

  return out;
}

// ─── Validator ───────────────────────────────────────────────────────────────

function validate(lesson) {
  const content = lesson.content;
  const total = content.length;
  const nonEmpty = content.filter(
    b => b.type === 'text' && b.spans.some(s => s.text.trim() !== '')
  ).length;
  const sections = content.filter(b => b.type === 'section').length;
  const images = content.filter(b => b.type === 'imagePlaceholder').length;

  const errors = [];
  if (total < 35) errors.push(`Troppo corta: ${total} blocchi (minimo 35)`);
  if (nonEmpty < 20) errors.push(`Troppo pochi testi: ${nonEmpty} non vuoti (minimo 20)`);
  if (sections < 4) errors.push(`Troppo poche sezioni: ${sections} (minimo 4)`);
  if (images > 4) errors.push(`Troppe immagini: ${images} (massimo 4)`);

  return errors;
}

// ─── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(lesson) {
  return `Genera la lezione completa su: **${lesson.title}**

**Slug:** ${lesson.slug}
**Materia:** ${lesson.materia}
**Difficoltà:** ${lesson.difficolta}
**Categorie:** ${lesson.categoria.join(', ')}
**Classi:** ${lesson.classe.join(', ')}

**Query principali (ottimizza per queste):**
${lesson.queryPrincipali.map(q => `- ${q}`).join('\n')}

**Domande veloci da rispondere nel testo:**
${lesson.domandeVeloci.map(q => `- ${q}`).join('\n')}

**Argomenti da coprire obbligatoriamente:**
${lesson.argomenti.map(a => `- ${a}`).join('\n')}

Ricorda: almeno 35 blocchi totali, almeno 6 sezioni. Fai il self-check prima di rispondere.`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const shouldPush = args.includes('--push');
  const slugArg = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

  // Load queue
  const queuePath = path.join(__dirname, 'lesson-queue.json');
  const queue = JSON.parse(readFileSync(queuePath, 'utf8'));

  // Pick lesson — when --slug is given, ignore status so we can re-iterate freely
  const lesson = slugArg
    ? queue.find(l => l.slug === slugArg)
    : queue.find(l => l.status === 'pending' && l.tier === 1);

  if (!lesson) {
    console.error(slugArg
      ? `Lezione "${slugArg}" non trovata in lesson-queue.json`
      : 'Nessuna lezione tier-1 pending'
    );
    process.exit(1);
  }

  console.log(`\n🎓 Genero: ${lesson.title}`);
  console.log(`   Slug: ${lesson.slug} | ${lesson.materia} | ${lesson.difficolta}\n`);

  // Load instructions
  const systemPrompt = readFileSync(path.join(__dirname, 'lesson-instructions.md'), 'utf8');

  // Call OpenAI
  console.log('⏳ Chiamata OpenAI (può richiedere 1-2 minuti)...');
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildUserPrompt(lesson) },
    ],
    response_format: zodResponseFormat(LessonIntermediate, 'lesson'),
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content;
  const intermediate = LessonIntermediate.parse(JSON.parse(raw));

  // Validate
  const errors = validate(intermediate);
  if (errors.length) {
    console.error('\n❌ Validazione fallita:');
    errors.forEach(e => console.error(`   • ${e}`));
    console.error('\nJSON intermedio salvato in /tmp/lesson-intermediate.json per debug');
    writeFileSync('/tmp/lesson-intermediate.json', JSON.stringify(intermediate, null, 2));
    process.exit(1);
  }

  // Stats
  const total = intermediate.content.length;
  const sections = intermediate.content.filter(b => b.type === 'section').length;
  const images = intermediate.content.filter(b => b.type === 'imagePlaceholder').length;
  const formulas = intermediate.content.filter(b => b.type === 'displayFormula').length;
  console.log(`\n✅ Validazione OK: ${total} blocchi | ${sections} sezioni | ${formulas} formule | ${images} immagini`);

  // Convert to Sanity
  const sanityContent = toSanityBlocks(intermediate.content);

  const doc = {
    _type: 'lesson',
    title: intermediate.title,
    subtitle: intermediate.subtitle,
    nomeAbbreviato: intermediate.nomeAbbreviato,
    materia: intermediate.materia,
    difficolta: intermediate.difficolta,
    slug: { _type: 'slug', current: intermediate.slug },
    categoria: intermediate.categoria,
    classe: intermediate.classe,
    content: sanityContent,
  };

  if (!shouldPush) {
    const outPath = path.join(__dirname, `lesson-preview-${lesson.slug}.json`);
    writeFileSync(outPath, JSON.stringify(doc, null, 2));
    console.log(`\n📄 Preview salvata in: scripts/lesson-preview-${lesson.slug}.json`);
    console.log('   Rilancia con --push per pushare su Sanity.\n');
    return;
  }

  // Use slug as deterministic _id
  doc._id = intermediate.slug;

  console.log('\n🚀 Push su Sanity...');
  const result = await sanity.createOrReplace(doc);
  console.log(`✅ Lezione salvata: ${result._id}`);
  console.log(`   https://www.sanity.io/manage/personal/project/0nqn5jl0/content;${result._id}`);

  // Mark as done only if it was still pending
  if (lesson.status === 'pending') {
    lesson.status = 'done';
    writeFileSync(queuePath, JSON.stringify(queue, null, 2));
    console.log('   lesson-queue.json aggiornato.\n');
  } else {
    console.log('   (status già done — lesson-queue.json invariato)\n');
  }
}

main().catch(err => {
  console.error('\n💥 Errore:', err.message);
  process.exit(1);
});
