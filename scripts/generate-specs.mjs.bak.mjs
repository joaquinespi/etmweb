// scripts/generate-specs.mjs
//
// Genera un PDF de ficha técnica por cada producto que tenga `specs`
// en su frontmatter. No depende de Chromium/Puppeteer: dibuja el PDF
// directamente con pdf-lib, así que corre igual en tu Mac, en CI,
// o en el cron de un hosting compartido.

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PRODUCTS_DIR = './src/content/products';
const OUTPUT_DIR = './public/specs';

// Paleta equivalente a la que usaba el diseño HTML anterior
const ORANGE = rgb(1, 0.31, 0);           // #ff4f00
const DARK = rgb(0.102, 0.129, 0.149);    // #1a202c
const HEADER_BG = rgb(0.973, 0.980, 0.988); // #f8fafc
const LABEL_GRAY = rgb(0.392, 0.455, 0.545); // #64748b
const BORDER_GRAY = rgb(0.929, 0.945, 0.965); // #edf2f7
const KEY_COLOR = rgb(0.290, 0.335, 0.404);   // #4a5568
const FOOTER_GRAY = rgb(0.627, 0.678, 0.745); // #a0aec0

// A4 en puntos (1mm ≈ 2.8346pt)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;   // ~20mm
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const ROW_HEIGHT = 26;

function safeSlug(title) {
  return title
    .toLowerCase()
    .replace(/\//g, '-')
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generatePDFs() {
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('🚀 Iniciando generación de PDFs (sin Chromium, vía pdf-lib)...');

  const files = fs
    .readdirSync(PRODUCTS_DIR)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(PRODUCTS_DIR, file), 'utf-8');
    const { data } = matter(content);

    if (!data.specs || data.specs.length === 0) continue;

    const safeTitle = safeSlug(data.title);

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const tableWidth = PAGE_WIDTH - MARGIN_X * 2;
    const colSplit = MARGIN_X + tableWidth * 0.32;

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN_TOP;

    const drawFooter = (p) => {
      const footerText = 'ExpansionTec Lima — Documento oficial generado automáticamente';
      const textWidth = fontRegular.widthOfTextAtSize(footerText, 8);
      p.drawText(footerText, {
        x: (PAGE_WIDTH - textWidth) / 2,
        y: 28,
        size: 8,
        font: fontRegular,
        color: FOOTER_GRAY,
      });
    };

    const drawTableHeader = (p, startY) => {
      p.drawRectangle({
        x: MARGIN_X,
        y: startY - 18,
        width: tableWidth,
        height: 24,
        color: HEADER_BG,
      });
      p.drawText('ESPECIFICACIÓN', {
        x: MARGIN_X + 10,
        y: startY - 11,
        size: 8,
        font: fontBold,
        color: LABEL_GRAY,
      });
      p.drawText('DETALLE', {
        x: colSplit,
        y: startY - 11,
        size: 8,
        font: fontBold,
        color: LABEL_GRAY,
      });
      return startY - 34;
    };

    // --- Encabezado (solo en la primera página) ---
    const brand = (data.brand || 'ExpansionTec').toUpperCase();
    page.drawText(brand, {
      x: MARGIN_X,
      y,
      size: 9,
      font: fontBold,
      color: ORANGE,
    });
    y -= 26;

    page.drawText(`Ficha Técnica: ${data.title}`, {
      x: MARGIN_X,
      y,
      size: 22,
      font: fontBold,
      color: DARK,
    });
    y -= 16;

    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: PAGE_WIDTH - MARGIN_X, y },
      thickness: 3,
      color: ORANGE,
    });
    y -= 26;

    y = drawTableHeader(page, y);

    // --- Filas de la tabla ---
    for (const spec of data.specs) {
      if (y < MARGIN_BOTTOM + ROW_HEIGHT) {
        drawFooter(page);
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN_TOP;
        y = drawTableHeader(page, y);
      }

      page.drawText(String(spec.key ?? ''), {
        x: MARGIN_X + 10,
        y,
        size: 10,
        font: fontBold,
        color: KEY_COLOR,
      });
      page.drawText(String(spec.value ?? ''), {
        x: colSplit,
        y,
        size: 10,
        font: fontRegular,
        color: DARK,
        maxWidth: PAGE_WIDTH - MARGIN_X - colSplit,
      });

      y -= 8;
      page.drawLine({
        start: { x: MARGIN_X, y },
        end: { x: PAGE_WIDTH - MARGIN_X, y },
        thickness: 0.5,
        color: BORDER_GRAY,
      });
      y -= ROW_HEIGHT - 8;
    }

    drawFooter(page);

    const pdfBytes = await pdfDoc.save();
    const pdfPath = path.join(OUTPUT_DIR, `${safeTitle}.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);
    console.log(`✅ PDF generado: ${pdfPath}`);
  }

  console.log('✨ Proceso terminado con éxito.');
}

generatePDFs().catch((err) => {
  console.error('❌ Error generando PDFs:', err);
  process.exit(1);
});
