import { createClient } from '@sanity/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione Sanity
const client = createClient({
  projectId: '0nqn5jl0',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2025-07-23',
  token: process.env.SANITY_TOKEN,
});

// Leggi il file CSV con le mappature
const csvPath = path.join(__dirname, '..', 'image-rename-undo-1760676828915.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV e crea una mappa oldValue -> newValue
const lines = csvContent.trim().split('\n');
const urlMappings = new Map(); // oldValue -> newValue

lines.slice(1).forEach(line => {
  const match = line.match(/^([^,]+),([^,]+),([^,]+),(.+)$/);
  if (match) {
    const [, , oldValue, newValue] = match;
    urlMappings.set(oldValue, newValue);
  }
});

console.log(`📊 Caricate ${urlMappings.size} mappature dal CSV\n`);

// Funzione per ottenere tutte le immagini dalla cartella public
function getAllImagesFromPublic() {
  const imagesDir = path.join(__dirname, '..', 'public', 'images');
  const imageFiles = new Set();

  function scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          const relativePath = path.relative(imagesDir, fullPath);
          imageFiles.add(relativePath);
          // Aggiungi anche con il prefisso images/
          imageFiles.add(`images/${relativePath}`);
        }
      }
    } catch (error) {
      console.error(`Errore nella scansione di ${dir}:`, error.message);
    }
  }

  if (fs.existsSync(imagesDir)) {
    scanDirectory(imagesDir);
  }

  return imageFiles;
}

// Funzione per trovare il nuovo URL corretto
function findCorrectUrl(currentUrl, publicImages) {
  // Estrai il nome del file dall'URL corrente
  const urlWithoutDomain = currentUrl.replace('https://theoremz.com/', '').replace('http://theoremz.com/', '');
  
  // 1. Controlla se esiste già una mappatura nel CSV
  if (urlMappings.has(currentUrl)) {
    const newUrl = urlMappings.get(currentUrl);
    const newPath = newUrl.replace('https://theoremz.com/', '');
    if (publicImages.has(newPath) || publicImages.has(newPath.replace('images/', ''))) {
      return newUrl;
    }
  }
  
  // 2. Se il file esiste già, non fare nulla
  if (publicImages.has(urlWithoutDomain) || publicImages.has(urlWithoutDomain.replace('images/', ''))) {
    return null;
  }
  
  // 3. Prova a sostituire underscore con dash
  if (urlWithoutDomain.includes('_')) {
    const withDash = urlWithoutDomain.replace(/_/g, '-');
    if (publicImages.has(withDash) || publicImages.has(withDash.replace('images/', ''))) {
      return `https://theoremz.com/${withDash}`;
    }
  }
  
  // 4. Cerca varianti del nome file
  const fileName = urlWithoutDomain.split('/').pop();
  
  // Cerca tra tutte le immagini disponibili
  for (const img of publicImages) {
    const imgName = img.split('/').pop();
    
    // Match esatto del nome file (ignora il path)
    if (imgName === fileName) {
      return `https://theoremz.com/${img}`;
    }
    
    // Match con underscore -> dash
    if (fileName.replace(/_/g, '-') === imgName) {
      return `https://theoremz.com/${img}`;
    }
  }
  
  return null;
}

// Funzione principale
async function main() {
  console.log('🚀 Fix automatico delle immagini usando le mappature CSV\n');
  console.log('='.repeat(60) + '\n');
  
  if (!process.env.SANITY_TOKEN) {
    console.error('❌ Errore: SANITY_TOKEN non impostato');
    process.exit(1);
  }

  // 1. Carica tutte le immagini disponibili
  console.log('📁 Scansione cartella public/images...\n');
  const publicImages = getAllImagesFromPublic();
  console.log(`✓ Trovate ${publicImages.size} immagini disponibili\n`);

  // 2. Ottieni tutti i documenti
  console.log('🔍 Scansione documenti Sanity...\n');
  const query = `*[_type == "lesson"] {
    _id,
    slug,
    title,
    content[] {
      ...,
      _type == "imageExternal" => {
        url,
        alt,
        _key
      }
    }
  }`;
  
  const documents = await client.fetch(query);
  console.log(`📄 Trovati ${documents.length} documenti\n`);

  // 3. Analizza e correggi
  const fixes = [];
  let skipped = 0;
  let notFound = 0;

  for (const doc of documents) {
    if (!doc.content || !Array.isArray(doc.content)) continue;
    
    for (let i = 0; i < doc.content.length; i++) {
      const block = doc.content[i];
      
      if (block._type === 'imageExternal' && block.url) {
        const correctUrl = findCorrectUrl(block.url, publicImages);
        
        if (correctUrl && correctUrl !== block.url) {
          fixes.push({
            docId: doc._id,
            docSlug: doc.slug?.current || doc._id,
            docTitle: doc.title?.it || 'Senza titolo',
            index: i,
            oldUrl: block.url,
            newUrl: correctUrl,
            _key: block._key
          });
        } else if (!correctUrl && !block.url.startsWith('https://theoremz.com/images/')) {
          notFound++;
        } else {
          skipped++;
        }
      }
    }
  }

  console.log('='.repeat(60));
  console.log('📊 ANALISI');
  console.log('='.repeat(60));
  console.log(`Immagini corrette da correggere: ${fixes.length}`);
  console.log(`Immagini già corrette:           ${skipped}`);
  console.log(`Immagini non trovate:            ${notFound}`);
  console.log('='.repeat(60) + '\n');

  if (fixes.length === 0) {
    console.log('✅ Nessuna correzione necessaria!\n');
    return;
  }

  // 4. Applica le correzioni
  console.log('🔧 Applicazione correzioni...\n');
  
  let updated = 0;
  let errors = 0;

  for (const fix of fixes) {
    try {
      await client
        .patch(fix.docId)
        .set({ [`content[${fix.index}].url`]: fix.newUrl })
        .commit();
      
      const oldName = fix.oldUrl.split('/').pop();
      const newName = fix.newUrl.split('/').pop();
      
      console.log(`✓ ${fix.docSlug}`);
      console.log(`  ${oldName} → ${newName}`);
      
      updated++;
      
      // Piccola pausa per non sovraccaricare l'API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Errore su ${fix.docSlug}:`, error.message);
      errors++;
    }
  }

  // 5. Riepilogo finale
  console.log('\n' + '='.repeat(60));
  console.log('📊 RISULTATI FINALI');
  console.log('='.repeat(60));
  console.log(`Correzioni applicate:   ${updated}`);
  console.log(`Errori:                 ${errors}`);
  console.log('='.repeat(60) + '\n');

  if (updated > 0) {
    console.log('✅ Correzioni completate con successo!\n');
    console.log('💡 Esegui nuovamente check-missing-images.mjs per verificare le immagini ancora mancanti.\n');
  }
}

// Esegui lo script
main().catch(error => {
  console.error('💥 Errore fatale:', error);
  process.exit(1);
});
