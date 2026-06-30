#!/usr/bin/env node
/**
 * fix-categories.mjs
 * Migrazione one-shot delle categorie su Sanity.
 * Applica la tassonomia pulita e fa dedup.
 * Usage: node scripts/fix-categories.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@sanity/client";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

const sanity = createClient({
  projectId: "0nqn5jl0",
  dataset: "production",
  useCdn: false,
  apiVersion: "2025-01-01",
  token: process.env.SANITY_TOKEN,
});

// ─── Mappa categoria vecchia → categoria nuova ───────────────────────────────

const CAT_MAP = {
  // MATEMATICA — livello "medie" assorbito nel genitore
  "Algebra medie":          "Algebra",
  "Aritmetica medie":       "Aritmetica",
  "Geometria medie":        "Geometria euclidea",

  // MATEMATICA — geometria: specificità assorbite in Geometria euclidea
  "Triangoli":              "Geometria euclidea",
  "Quadrilateri":           "Geometria euclidea",
  "Poligoni regolari":      "Geometria euclidea",
  "Circonferenza":          "Geometria euclidea",

  // MATEMATICA — analisi e funzioni
  "Analisi":                "Analisi matematica",
  "Integrali":              "Analisi matematica",
  "Funzioni":               "Analisi matematica",
  "Derivate":               "Studio di funzione",

  // MATEMATICA — probabilità e statistica
  "Probabilità":            "Probabilità e statistica",
  "Statistica":             "Probabilità e statistica",

  // MATEMATICA — equazioni/disequazioni
  "Equazioni":              "Equazioni e disequazioni",
  "Disequazioni":           "Equazioni e disequazioni",

  // MATEMATICA — esponenziali e logaritmi
  "Esponenziali":           "Esponenziali e logaritmi",

  // FISICA — circuiti
  "Elettronica":            "Circuiti elettrici",

  // FISICA — fluidi
  "Fluidi":                 "Meccanica dei fluidi",
  "Meccanica dei fluidi":   "Meccanica dei fluidi",   // già corretto, no-op

  // FISICA — grandezze e misure
  "Notazioni":              "Grandezze e misure",
  "Metrologia":             "Grandezze e misure",
  "Grandezze fisiche":      "Grandezze e misure",

  // FISICA — cinematica
  "Moti":                   "Cinematica",
  "Moto circolare":         "Cinematica",

  // FISICA — dinamica
  "Moto armonico":          "Dinamica",
  "Meccanica":              "Dinamica",

  // FISICA — onde
  "Acustica":               "Onde",

  // FISICA — ottica
  "Ottica fisica":          "Ottica",

  // FISICA — elettromagnetismo
  "Induzione":              "Elettromagnetismo",

  // FISICA — fisica moderna
  "Fisica atomica":         "Fisica moderna",

  // FISICA — termodinamica
  "Termologia":             "Termodinamica",
};

function applyMapping(categorieOld) {
  if (!Array.isArray(categorieOld)) return categorieOld;
  const seen = new Set();
  const out = [];
  for (const c of categorieOld) {
    const mapped = CAT_MAP[c] ?? c;
    if (!seen.has(mapped)) {
      seen.add(mapped);
      out.push(mapped);
    }
  }
  return out;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const lessons = await sanity.fetch(
  `*[_type == "lesson" && defined(slug.current)] { _id, title, "slug": slug.current, categoria }`
);

console.log(`\nLezioni totali: ${lessons.length}`);
if (DRY_RUN) console.log("(DRY RUN — nessuna modifica su Sanity)\n");

let changed = 0;
let unchanged = 0;
const log = [];

for (const lesson of lessons) {
  const old = lesson.categoria ?? [];
  const updated = applyMapping(old);

  const sameLength = old.length === updated.length;
  const sameContent = sameLength && old.every((c, i) => c === updated[i]);

  if (sameContent) { unchanged++; continue; }

  log.push({ id: lesson._id, slug: lesson.slug, title: lesson.title, old, updated });

  changed++;
}

// ─── Applica tutte le modifiche in una singola transazione ──────────────────

if (!DRY_RUN && log.length > 0) {
  const tx = sanity.transaction();
  for (const { id, updated } of log) {
    tx.patch(id, { set: { categoria: updated } });
  }
  await tx.commit();
  console.log(`\nTransazione completata: ${log.length} lezioni aggiornate su Sanity.`);
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log(`Modificate: ${changed} | Invariate: ${unchanged}\n`);
for (const { slug, title, old, updated } of log) {
  console.log(`  [${slug}]`);
  if (old.join(", ") !== updated.join(", ")) {
    console.log(`    Prima:  ${old.join(", ") || "—"}`);
    console.log(`    Dopo:   ${updated.join(", ") || "—"}`);
  }
}

// ─── Aggiorna anche lesson-queue.json ────────────────────────────────────────

const queuePath = path.join(__dirname, "lesson-queue.json");
const queue = JSON.parse(readFileSync(queuePath, "utf8"));
let queueChanged = 0;

for (const entry of queue) {
  if (!Array.isArray(entry.categoria)) continue;
  const updated = applyMapping(entry.categoria);
  const same = entry.categoria.length === updated.length &&
    entry.categoria.every((c, i) => c === updated[i]);
  if (!same) {
    entry.categoria = updated;
    queueChanged++;
  }
}

if (!DRY_RUN) {
  writeFileSync(queuePath, JSON.stringify(queue, null, 2));
  console.log(`\nLesson-queue aggiornato: ${queueChanged} entry modificate.`);
} else {
  console.log(`\n(DRY RUN) Lesson-queue: ${queueChanged} entry da aggiornare.`);
}

console.log("\nDone.");
