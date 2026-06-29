#!/usr/bin/env node
// Genera tutte le lezioni pending in sequenza.
// - Segna ogni lezione "done" nel queue dopo il successo (già fatto da generate-lesson.mjs)
// - Se una lezione fallisce 3 volte consecutive, la segna "error" e passa alla successiva
// - Basta rilanciare: riprende dalle lezioni ancora "pending"

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const queuePath = path.join(__dirname, "lesson-queue.json");

function loadQueue() {
  return JSON.parse(readFileSync(queuePath, "utf8"));
}

function markError(slug) {
  const queue = loadQueue();
  const lesson = queue.find((l) => l.slug === slug);
  if (lesson) {
    lesson.status = "error";
    writeFileSync(queuePath, JSON.stringify(queue, null, 2));
  }
}

function pendingCount() {
  return loadQueue().filter((l) => l.status === "pending" && l.tier === 1).length;
}

function nextPendingSlug() {
  const lesson = loadQueue().find((l) => l.status === "pending" && l.tier === 1);
  return lesson?.slug ?? null;
}

let totalDone = 0;
let totalErrors = 0;

console.log("\n🚀 run-all: generazione automatica di tutte le lezioni pending\n");

while (true) {
  const pending = pendingCount();
  if (pending === 0) {
    console.log("\n✅ Tutte le lezioni completate!");
    console.log(`   Generate: ${totalDone} | Errori: ${totalErrors}`);
    if (totalErrors > 0) {
      const errored = loadQueue().filter((l) => l.status === "error").map((l) => l.slug);
      console.log(`   Lezioni con errore: ${errored.join(", ")}`);
      console.log('   Rimetti status a "pending" nel queue e rilancia per riprovare.');
    }
    break;
  }

  const slug = nextPendingSlug();
  console.log(`\n━━━ [${totalDone + totalErrors + 1}] ${slug} (${pending} pending rimaste) ━━━`);

  let attempts = 0;
  let success = false;

  while (attempts < 3 && !success) {
    attempts++;
    try {
      execSync(`node ${path.join(__dirname, "generate-lesson.mjs")} --slug ${slug} --push`, {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
      });
      success = true;
      totalDone++;
    } catch {
      console.error(`\n⚠️  Tentativo ${attempts}/3 fallito per "${slug}"`);
      if (attempts < 3) {
        console.log("   Riprovo tra 10 secondi...");
        await new Promise((r) => setTimeout(r, 10000));
      }
    }
  }

  if (!success) {
    console.error(`\n💥 "${slug}" fallita 3 volte — segnata come "error", passo alla successiva.`);
    markError(slug);
    totalErrors++;
  }
}
