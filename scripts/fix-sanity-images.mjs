import { createClient } from "@sanity/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione Sanity
const client = createClient({
  projectId: "0nqn5jl0",
  dataset: "production",
  useCdn: false,
  apiVersion: "2025-07-23",
  token: process.env.SANITY_TOKEN,
});

// Leggi il file CSV
const csvPath = path.join(
  __dirname,
  "..",
  "image-rename-undo-1760676828915.csv"
);
const csvContent = fs.readFileSync(csvPath, "utf-8");

// Parse CSV
const lines = csvContent.trim().split("\n");
const mappings = lines
  .slice(1)
  .map((line) => {
    // Parse CSV considerando che i campi potrebbero contenere virgole
    const match = line.match(/^([^,]+),([^,]+),([^,]+),(.+)$/);
    if (!match) return null;

    const [, docId, oldValue, newValue, pathKey] = match;
    return { docId, oldValue, newValue, pathKey };
  })
  .filter(Boolean);

console.log(`📊 Trovate ${mappings.length} mappature nel CSV\n`);

// Raggruppa per docId
const groupedByDoc = mappings.reduce((acc, mapping) => {
  if (!acc[mapping.docId]) {
    acc[mapping.docId] = [];
  }
  acc[mapping.docId].push(mapping);
  return acc;
}, {});

console.log(
  `📄 Documenti da aggiornare: ${Object.keys(groupedByDoc).length}\n`
);

// Funzione per estrarre il path e l'indice dall'array
function parseContentPath(pathKey) {
  // Esempio: "content[6].url" -> { arrayField: 'content', index: 6, field: 'url' }
  const match = pathKey.match(/^(\w+)\[(\d+)\]\.(\w+)$/);
  if (!match) return null;

  return {
    arrayField: match[1],
    index: parseInt(match[2]),
    field: match[3],
  };
}

// Funzione per aggiornare un documento
async function updateDocument(docId, mappingsForDoc) {
  try {
    // Recupera il documento
    const doc = await client.getDocument(docId);

    if (!doc) {
      console.log(`⚠️  Documento non trovato: ${docId}`);
      return { success: false, reason: "not_found" };
    }

    // Crea le patch per aggiornare
    const patches = [];
    let updatedCount = 0;
    let skippedCount = 0;

    for (const mapping of mappingsForDoc) {
      const pathInfo = parseContentPath(mapping.pathKey);

      if (!pathInfo) {
        skippedCount++;
        continue;
      }

      // Verifica che l'array esista e abbia l'elemento
      const arrayData = doc[pathInfo.arrayField];
      if (!arrayData || !Array.isArray(arrayData)) {
        skippedCount++;
        continue;
      }

      if (pathInfo.index >= arrayData.length) {
        skippedCount++;
        continue;
      }

      const currentValue = arrayData[pathInfo.index]?.[pathInfo.field];

      // Verifica se il valore corrente corrisponde a quello vecchio
      if (currentValue === mapping.oldValue) {
        // Estrai solo il path relativo dal newValue
        const newPath = mapping.newValue.replace("https://theoremz.com/", "");

        patches.push({
          path: `${pathInfo.arrayField}[${pathInfo.index}].${pathInfo.field}`,
          oldValue: mapping.oldValue,
          newValue: `https://theoremz.com/${newPath}`,
        });
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    if (patches.length === 0) {
      return { success: true, updated: 0, skipped: skippedCount };
    }

    // Applica le patch
    console.log(`\n📄 ${docId} - Aggiornamento di ${patches.length} immagini:`);

    for (const patch of patches) {
      await client
        .patch(docId)
        .set({ [patch.path]: patch.newValue })
        .commit();

      const oldFilename = patch.oldValue.split("/").pop();
      const newFilename = patch.newValue.split("/").pop();
      console.log(`   ✓ ${oldFilename} → ${newFilename}`);
    }

    return { success: true, updated: updatedCount, skipped: skippedCount };
  } catch (error) {
    console.error(`❌ Errore per ${docId}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Funzione principale
async function main() {
  console.log("🚀 Avvio script di aggiornamento immagini Sanity\n");

  if (!process.env.SANITY_TOKEN) {
    console.error("❌ Errore: SANITY_TOKEN non impostato");
    console.log("\nPer impostare il token:");
    console.log('export SANITY_TOKEN="il-tuo-token"\n');
    process.exit(1);
  }

  const results = {
    total: Object.keys(groupedByDoc).length,
    success: 0,
    failed: 0,
    totalUpdated: 0,
    totalSkipped: 0,
  };

  // Processa ogni documento
  for (const [docId, mappingsForDoc] of Object.entries(groupedByDoc)) {
    const result = await updateDocument(docId, mappingsForDoc);

    if (result.success) {
      results.success++;
      results.totalUpdated += result.updated || 0;
      results.totalSkipped += result.skipped || 0;
    } else {
      results.failed++;
    }

    // Piccola pausa per non sovraccaricare l'API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Riepilogo finale
  console.log("\n" + "=".repeat(60));
  console.log("📊 RIEPILOGO FINALE");
  console.log("=".repeat(60));
  console.log(`Documenti totali:       ${results.total}`);
  console.log(`Documenti aggiornati:   ${results.success}`);
  console.log(`Documenti falliti:      ${results.failed}`);
  console.log(`Campi aggiornati:       ${results.totalUpdated}`);
  console.log(`Campi saltati:          ${results.totalSkipped}`);
  console.log("=".repeat(60) + "\n");

  if (results.failed > 0) {
    console.log(
      "⚠️  Alcuni documenti non sono stati aggiornati. Controlla i log sopra."
    );
  } else {
    console.log("✅ Tutti i documenti sono stati processati con successo!");
  }
}

// Esegui lo script
main().catch((error) => {
  console.error("💥 Errore fatale:", error);
  process.exit(1);
});
