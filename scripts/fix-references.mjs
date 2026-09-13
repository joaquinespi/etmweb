// scripts/fix-references.mjs
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fixReferences() {
  const productsDir = path.join(__dirname, '../src/content/products');
  const files = await fs.readdir(productsDir);

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const filePath = path.join(productsDir, file);
    let content = await fs.readFile(filePath, 'utf-8');

    // Fix brand reference
    content = content.replace(
      /brand:\s*src\/content\/brands\/(.+)\.json/g,
      'brand: $1'
    );

    // Fix category reference
    content = content.replace(
      /category:\s*src\/content\/categories\/(.+)\.json/g,
      'category: $1'
    );

    // Fix location references
    content = content.replace(
      /location:\s*src\/content\/locations\/(.+)\.md/g,
      'location: $1'
    );

    await fs.writeFile(filePath, content);
    console.log(`✅ Fixed: ${file}`);
  }

  console.log('🎉 All references fixed!');
}

fixReferences().catch(console.error);