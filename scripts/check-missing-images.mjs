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

// Funzione per ottenere tutti i file nella cartella public/images ricorsivamente
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
          // Salva il path relativo dalla cartella images
          const relativePath = path.relative(imagesDir, fullPath);
          imageFiles.add(relativePath);
        }
      }
    } catch (error) {
      console.error(`Errore nella scansione di ${dir}:`, error.message);
    }
  }

  if (fs.existsSync(imagesDir)) {
    scanDirectory(imagesDir);
  } else {
    console.error('❌ Cartella public/images non trovata!');
  }

  return imageFiles;
}

// Funzione per estrarre i nomi delle immagini dai link
function extractImageName(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Rimuovi il dominio se presente
  let imagePath = url.replace('https://theoremz.com/', '').replace('http://theoremz.com/', '');
  
  // Rimuovi il prefixo images/ se presente
  imagePath = imagePath.replace(/^images\//, '');
  
  return imagePath || null;
}

// Funzione per cercare tutte le immagini nei documenti Sanity
async function getAllImagesFromSanity() {
  console.log('🔍 Scansione documenti Sanity...\n');
  
  try {
    // Query per ottenere tutti i documenti di tipo 'lesson'
    const query = `*[_type == "lesson"] {
      _id,
      slug,
      title,
      content[] {
        ...,
        _type == "imageExternal" => {
          url,
          alt
        }
      }
    }`;
    
    const documents = await client.fetch(query);
    console.log(`📄 Trovati ${documents.length} documenti\n`);
    
    const allImages = []; // Array di tutte le immagini con info documento
    
    for (const doc of documents) {
      if (!doc.content || !Array.isArray(doc.content)) continue;
      
      for (let i = 0; i < doc.content.length; i++) {
        const block = doc.content[i];
        if (block._type === 'imageExternal' && block.url) {
          const imageName = extractImageName(block.url);
          if (imageName) {
            allImages.push({
              imageName,
              docId: doc._id,
              docTitle: doc.title?.it || 'Senza titolo',
              docSlug: doc.slug?.current || doc._id,
              url: block.url,
              index: i
            });
          }
        }
      }
    }
    
    return allImages;
    
  } catch (error) {
    console.error('❌ Errore nel fetch da Sanity:', error.message);
    throw error;
  }
}

// Funzione principale
async function main() {
  console.log('🚀 Controllo immagini mancanti\n');
  console.log('='.repeat(60) + '\n');
  
  if (!process.env.SANITY_TOKEN) {
    console.error('❌ Errore: SANITY_TOKEN non impostato');
    console.log('\nPer impostare il token:');
    console.log('export SANITY_TOKEN="il-tuo-token"\n');
    process.exit(1);
  }

  // 1. Ottieni tutte le immagini dalla cartella public
  console.log('📁 Scansione cartella public/images...\n');
  const publicImages = getAllImagesFromPublic();
  console.log(`✓ Trovate ${publicImages.size} immagini in public/images\n`);
  
  // 2. Ottieni tutte le immagini referenziate in Sanity
  const sanityImages = await getAllImagesFromSanity();
  console.log(`✓ Trovate ${sanityImages.length} immagini referenziate in Sanity\n`);
  
  // 3. Trova le immagini mancanti
  const missingImages = sanityImages.filter(img => !publicImages.has(img.imageName));
  
  // 4. Report
  console.log('='.repeat(60));
  console.log('📊 RISULTATI');
  console.log('='.repeat(60) + '\n');
  
  if (missingImages.length === 0) {
    console.log('✅ Tutte le immagini referenziate in Sanity sono present in public/images!\n');
  } else {
    console.log(`❌ Trovate ${missingImages.length} immagini mancanti:\n`);
    console.log('='.repeat(60) + '\n');
    
    for (const img of missingImages) {
      console.log(`📷 IMMAGINE MANCANTE: ${img.imageName}`);
      console.log(`   Documento ID:   ${img.docId}`);
      console.log(`   Titolo:         ${img.docTitle}`);
      console.log(`   Slug:           ${img.docSlug}`);
      console.log(`   URL corrente:   ${img.url}`);
      console.log(`   Indice content: [${img.index}]`);
      console.log('');
      console.log('-'.repeat(60) + '\n');
    }
    
    // Riepilogo finale
    console.log('='.repeat(60));
    console.log('RIEPILOGO');
    console.log('='.repeat(60));
    console.log(`Immagini in public/images:  ${publicImages.size}`);
    console.log(`Immagini in Sanity:         ${sanityImages.length}`);
    console.log(`Immagini mancanti:          ${missingImages.length}`);
    console.log('='.repeat(60) + '\n');
    
    // Salva la lista in un file
    const outputPath = path.join(__dirname, '..', 'missing-images-report.txt');
    const report = missingImages.map(img => {
      return `${img.imageName}\n  Documento: ${img.docSlug} (${img.docId})\n  URL: ${img.url}\n  Index: ${img.index}`;
    }).join('\n\n');
    
    fs.writeFileSync(outputPath, report);
    console.log(`📝 Report salvato in: missing-images-report.txt\n`);
  }
}

// Esegui lo script
main().catch(error => {
  console.error('💥 Errore fatale:', error);
  process.exit(1);
});
