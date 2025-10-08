import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FORMATS = ['webp']; // Possiamo aggiungere 'avif' se necessario
const WIDTHS = [360, 480, 640, 768, 960, 1200, 1600, 2000];
const QUALITY = 80;

async function optimizeImage(filePath) {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath, path.extname(filePath));
  
  for (const format of FORMATS) {
    for (const width of WIDTHS) {
      const outputPath = path.join(dir, `${filename}-${width}.${format}`);
      try {
        await sharp(filePath)
          .resize(width, null, { withoutEnlargement: true })
          .toFormat(format, { quality: QUALITY })
          .toFile(outputPath);
        console.log(`Creato: ${outputPath}`);
      } catch (error) {
        console.error(`Errore nell'ottimizzazione di ${filePath} a ${width}px:`, error.message);
      }
    }
  }
}

async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (/\.(jpg|jpeg|png)$/i.test(entry.name)) {
      console.log(`Ottimizzando: ${fullPath}`);
      await optimizeImage(fullPath);
    }
  }
}

async function main() {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const imagesDir = path.join(publicDir, 'images');
    
    // Verifica che la directory esista
    try {
      await fs.access(imagesDir);
    } catch {
      console.log('Directory /public/images non trovata, creazione...');
      await fs.mkdir(imagesDir, { recursive: true });
      console.log('Directory /public/images creata con successo.');
      return; // Esce se la directory è vuota
    }
    
    console.log('Inizio ottimizzazione immagini...');
    await processDirectory(imagesDir);
    console.log('Ottimizzazione immagini completata con successo!');
  } catch (error) {
    console.error('Errore durante l\'ottimizzazione:', error);
    process.exit(1);
  }
}

main();