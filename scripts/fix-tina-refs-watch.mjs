// scripts/fix-tina-refs-watch.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productsDir = path.join(__dirname, '../src/content/products');

console.log('👁️  Watching for changes in products...');

fs.watch(productsDir, { recursive: true }, (eventType, filename) => {
  if (filename && filename.endsWith('.md')) {
    console.log(`📝 Detected change: ${filename}`);

    // Pequeño debounce para evitar múltiples ejecuciones
    setTimeout(() => {
      execAsync('npm run fix:refs')
        .then(({ stdout }) => console.log(stdout))
        .catch(err => console.error('Error:', err));
    }, 500);
  }
});