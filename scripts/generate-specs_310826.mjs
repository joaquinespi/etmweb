// scripts/generate-specs.mjs
const PRODUCTS_DIR = './src/content/products';
const OUTPUT_DIR = './public/specs';

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import puppeteer from 'puppeteer';

// Asegurar que la carpeta de salida existe
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function generatePDFs() {
  // 1. Si estamos en un entorno sin Chromium disponible (Vercel, hosting compartido, etc.),
  //    salimos sin error. Los PDFs deben generarse en un entorno con Chromium (local o CI)
  //    y quedar commiteados/subidos en public/specs.
  if (process.env.VERCEL || process.env.SKIP_PDF_GENERATION) {
    console.log('⏭️ Generación de PDFs omitida en este entorno (VERCEL o SKIP_PDF_GENERATION activo).');
    return;
  }

  // Borra la carpeta de PDFs antes de generar los nuevos para no acumular archivos viejos
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const isMac = process.platform === 'darwin';
  const executablePath = isMac
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : undefined; // En Vercel/Linux se usa el path por defecto de Chromium

  console.log(`🚀 Iniciando generación de PDFs en ${isMac ? 'macOS' : 'Servidor/Linux'}...`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const files = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(PRODUCTS_DIR, file), 'utf-8');
    const { data } = matter(content);

    // Ignorar si no tiene especificaciones
    if (!data.specs || data.specs.length === 0) continue;

    // Limpieza de nombre de archivo (reemplaza "/" por "-")
    const safeTitle = data.title
      .toLowerCase()
      .replace(/\//g, '-')
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const htmlContent = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Satoshi:wght@400;700;900&display=swap');
            body { font-family: 'Satoshi', sans-serif; padding: 40px; color: #1a202c; }
            .header { border-bottom: 4px solid #ff4f00; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { color: #ff4f00; font-weight: bold; text-transform: uppercase; font-size: 12px; }
            h1 { font-size: 32px; margin: 5px 0; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #f8fafc; padding: 12px; color: #64748b; font-size: 10px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; }
            .key { font-weight: bold; width: 30%; color: #4a5568; }
            .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #a0aec0; padding-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="brand">${data.brand || 'ExpansionTec'}</span>
            <h1>Ficha Técnica: ${data.title}</h1>
          </div>
          <table>
            <thead><tr><th>Especificación</th><th>Detalle</th></tr></thead>
            <tbody>
              ${data.specs.map(s => `<tr><td class="key">${s.key}</td><td>${s.value}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="footer">ExpansionTec Lima — Documento oficial generado automáticamente</div>
        </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfPath = path.join(OUTPUT_DIR, `${safeTitle}.pdf`);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '10mm', right: '10mm' }
    });

    console.log(`✅ PDF generado: ${pdfPath}`);
  }

  await browser.close();
  console.log('✨ Proceso terminado con éxito.');
}

generatePDFs().catch(err => {
  console.error('❌ Error generando PDFs:', err);
  process.exit(1);
});