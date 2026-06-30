#!/usr/bin/env node
/**
 * fetch-slugs.mjs
 * Scarica da Sanity tutti gli slug delle lezioni pubblicate.
 * Output: scripts/lesson-slugs.json
 *
 * Usage: node scripts/fetch-slugs.mjs
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@sanity/client";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sanity = createClient({
  projectId: "0nqn5jl0",
  dataset: "production",
  useCdn: false,
  apiVersion: "2025-01-01",
  token: process.env.SANITY_TOKEN,
});

const lessons = await sanity.fetch(
  `*[_type == "lesson" && defined(slug.current)] | order(materia asc, title asc) {
    "slug": slug.current,
    title,
    materia,
    categoria
  }`
);

const out = path.join(__dirname, "lesson-slugs.json");
writeFileSync(out, JSON.stringify(lessons, null, 2));

console.log(`\n${lessons.length} lezioni scritte in lesson-slugs.json`);

// Stampa anche una quick reference per materia
const byMateria = {};
for (const l of lessons) {
  const m = l.materia || "senza-materia";
  (byMateria[m] ??= []).push(l.slug);
}
for (const [m, slugs] of Object.entries(byMateria)) {
  console.log(`\n── ${m.toUpperCase()} (${slugs.length}) ──`);
  for (const s of slugs) console.log(`  /${m}/${s}`);
}
