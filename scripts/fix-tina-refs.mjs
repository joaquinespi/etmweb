#!/usr/bin/env node
// scripts/fix-tina-refs.mjs
// Corrige automáticamente las referencias de Tina CMS de rutas completas a IDs simples

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  productsDir: path.join(__dirname, '../src/content/products'),
  // Patrones de reemplazo
  patterns: [
    {
      name: 'brand',
      regex: /^brand:\s*src\/content\/brands\/(.+?)\.json$/gm,
      replacement: 'brand: $1'
    },
    {
      name: 'category',
      regex: /^category:\s*src\/content\/categories\/(.+?)\.json$/gm,
      replacement: 'category: $1'
    },
    {
      name: 'locations',
      regex: /^(\s*- location:\s*)src\/content\/locations\/(.+?)\.md$/gm,
      replacement: '$1$2'
    }
  ]
};

async function fixFile(filePath) {
  let content = await fs.readFile(filePath, 'utf-8');
  const originalContent = content;
  let changes = [];

  for (const pattern of CONFIG.patterns) {
    const matches = [...content.matchAll(pattern.regex)];

    if (matches.length > 0) {
      content = content.replace(pattern.regex, pattern.replacement);
      changes.push(`${pattern.name}: ${matches.length} correcciones`);
    }
  }

  if (content !== originalContent) {
    await fs.writeFile(filePath, content, 'utf-8');
    return { fixed: true, changes };
  }

  return { fixed: false };
}

async function main() {
  console.log('🔧 Corrigiendo referencias de Tina CMS...\n');

  try {
    const files = await fs.readdir(CONFIG.productsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    let totalFixed = 0;
    let totalFiles = 0;

    for (const file of mdFiles) {
      const filePath = path.join(CONFIG.productsDir, file);
      const result = await fixFile(filePath);

      if (result.fixed) {
        console.log(`✅ ${file}`);
        result.changes.forEach(change => console.log(`   └─ ${change}`));
        totalFixed++;
      }
      totalFiles++;
    }

    console.log(`\n📊 Resumen: ${totalFixed}/${totalFiles} archivos corregidos`);

    if (totalFixed === 0) {
      console.log('✨ No se encontraron referencias para corregir');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();