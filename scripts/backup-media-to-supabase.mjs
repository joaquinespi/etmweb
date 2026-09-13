/**
 * backup-media-to-supabase.mjs
 * -----------------------------
 * Sube TODOS los archivos de public/uploads/ a un bucket
 * de Supabase Storage. Mantiene la estructura de carpetas.
 *
 * Uso:
 *   1. Crear bucket `tina-backup` (Private) en Supabase Storage
 *   2. npm run backup:media
 *
 * Idempotente: si el archivo ya existe, lo reemplaza.
 * Para 77 archivos (~50MB) tarda ~30s.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadEnv(path.join(ROOT, '.env'));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || 'tina-backup';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const UPLOADS_DIR = path.join(ROOT, 'public', 'uploads');

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase().slice(1);
  return {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', svg: 'image/svg+xml', gif: 'image/gif',
  }[ext] || 'application/octet-stream';
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else if (entry.isFile()) {
      out.push({
        local: full,
        // Ruta relativa con forward slashes (Supabase usa /)
        remote: path.relative(base, full).replace(/\\/g, '/'),
        size: fs.statSync(full).size,
      });
    }
  }
  return out;
}

async function uploadFile({ local, remote, size }) {
  const buffer = fs.readFileSync(local);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(remote, buffer, {
      contentType: getMimeType(local),
      upsert: true,
      cacheControl: '3600',
    });
  if (error) throw new Error(`${remote}: ${error.message}`);
  const kb = (size / 1024).toFixed(1);
  process.stdout.write(`   ✅ ${remote}  (${kb} KB)\n`);
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function main() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error(`❌ No existe ${UPLOADS_DIR}`);
    process.exit(1);
  }

  const files = walk(UPLOADS_DIR);
  if (files.length === 0) {
    console.log('   (no hay archivos en public/uploads/)');
    return;
  }

  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  const totalMB = (totalBytes / 1024 / 1024).toFixed(2);

  console.log(`\n🚀 Subiendo ${files.length} archivos (${totalMB} MB) → bucket "${BUCKET}"`);
  console.log('━'.repeat(50));

  const t0 = Date.now();
  let ok = 0, fail = 0;
  for (const f of files) {
    try {
      await uploadFile(f);
      ok++;
    } catch (e) {
      console.error(`   ❌ ${e.message}`);
      fail++;
    }
  }

  const ms = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('━'.repeat(50));
  console.log(`✨ ${ok}/${files.length} subidos en ${ms}s  (fallos: ${fail})\n`);
  if (ok > 0) {
    console.log('💡 Para que sean públicos y accesibles por URL, ve a:');
    console.log(`   Supabase → Storage → ${BUCKET} → Configuration → Public\n`);
  }
}

main().catch((err) => {
  console.error('\n💥 Backup de medios falló:', err.message || err);
  process.exit(1);
});