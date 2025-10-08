const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const FORMATS = ['webp']; // Possiamo aggiungere 'avif' se necessario
const WIDTHS = [360, 480, 640, 768, 960, 1200, 1600, 2000];
const QUALITY = 80;

async function optimizeImage(filePath) {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath, path.extname(filePath));
  
  for (const format of FORMATS) {
    for (const width of WIDTHS) {
      const outputPath = path.join(dir, `${filename}-${width}.${format}`);
      await sharp(filePath)
        .resize(width, null, { withoutEnlargement: true })
        [format]({ quality: QUALITY })
        .toFile(outputPath);
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
  const publicDir = path.join(process.cwd(), 'public');
  const imagesDir = path.join(publicDir, 'images');
  
  await processDirectory(imagesDir);
}

main().catch(console.error);