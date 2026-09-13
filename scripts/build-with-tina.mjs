// scripts/build-with-tina.mjs
import fs from 'fs';
import { execSync } from 'child_process';

const tinaAdminExists = fs.existsSync('public/admin/index.html');

if (tinaAdminExists) {
  console.log('✅ Tina admin ya existe en caché, saltando tinacms build...');
} else {
  console.log('🔨 Construyendo Tina admin...');
  execSync('tinacms build', { stdio: 'inherit' });
}

// Siempre build Astro
console.log('🔨 Construyendo Astro...');
execSync('astro build', { stdio: 'inherit' });