// scripts/generate-specs.mjs
//
// Genera un PDF de ficha técnica por cada producto que tenga `specs`
// en su frontmatter, con layout de cuadrícula (5 columnas por fila),
// imitando el diseño de infografía: imagen a la izquierda, título arriba,
// y tarjetas de especificación en grid a la derecha/abajo.
//
// No depende de Chromium/Puppeteer: dibuja el PDF directamente con
// pdf-lib, así que corre igual en tu Mac, en CI, o en el cron de un
// hosting compartido.
//
// El número de specs es variable (5 a 20+): el grid se ajusta a 5
// columnas fijas y N filas, paginando automáticamente si no caben
// todas en una sola página A4.

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PRODUCTS_DIR = "./src/content/products";
const OUTPUT_DIR = "./public/specs";
const IMAGE_ROOT = "./public"; // mainImage/images[0] son rutas tipo /uploads/products/xxx.png

// Paleta
const ORANGE = rgb(1, 0.31, 0); // #ff4f00
const DARK = rgb(0.102, 0.129, 0.149); // #1a202c
const CARD_BG = rgb(0.973, 0.98, 0.988); // #f8fafc
const CARD_BORDER = rgb(0.898, 0.914, 0.929); // #e5e8ed
const LABEL_GRAY = rgb(0.392, 0.455, 0.545); // #64748b
const KEY_COLOR = rgb(0.29, 0.335, 0.404); // #4a5568
const FOOTER_GRAY = rgb(0.627, 0.678, 0.745); // #a0aec0
const WHITE = rgb(1, 1, 1);

// A4 en puntos
const PAGE_WIDTH = 841.89; // A4 horizontal (landscape), más fiel al diseño de referencia
const PAGE_HEIGHT = 595.28;
const MARGIN_X = 36;
const MARGIN_TOP = 32;
const MARGIN_BOTTOM = 36;

const COLS = 5;
const GUTTER_X = 12;
const GUTTER_Y = 12;
const CARD_HEIGHT = 78;
const CARD_PADDING = 10;

function safeSlug(title) {
  return title
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Ícono vectorial simple según palabras clave del "key" de la spec.
// Evita depender de archivos externos: son formas dibujadas con pdf-lib.
function drawSpecIcon(page, key, cx, cy) {
  const k = key.toLowerCase();
  const r = 8;

  if (k.includes("ram") || k.includes("almacenamiento") || k.includes("interna") || k.includes("sd")) {
    page.drawRectangle({
      x: cx - r,
      y: cy - r * 0.7,
      width: r * 2,
      height: r * 1.4,
      color: ORANGE,
      borderRadius: 2,
    });
  } else if (k.includes("cámara") || k.includes("camara")) {
    page.drawCircle({ x: cx, y: cy, size: r * 0.9, color: ORANGE });
    page.drawCircle({ x: cx, y: cy, size: r * 0.4, color: WHITE });
  } else if (k.includes("batería") || k.includes("bateria")) {
    page.drawRectangle({
      x: cx - r,
      y: cy - r * 0.6,
      width: r * 1.8,
      height: r * 1.2,
      color: ORANGE,
    });
    page.drawRectangle({
      x: cx + r * 0.8,
      y: cy - r * 0.3,
      width: r * 0.3,
      height: r * 0.6,
      color: ORANGE,
    });
  } else if (k.includes("pantalla") || k.includes("resoluci")) {
    page.drawRectangle({
      x: cx - r,
      y: cy - r * 0.75,
      width: r * 2,
      height: r * 1.5,
      borderColor: ORANGE,
      borderWidth: 1.5,
      color: undefined,
    });
  } else if (k.includes("procesador") || k.includes("núcleo") || k.includes("nucleo") || k.includes("cpu")) {
    page.drawRectangle({
      x: cx - r * 0.8,
      y: cy - r * 0.8,
      width: r * 1.6,
      height: r * 1.6,
      color: ORANGE,
    });
  } else if (k.includes("peso") || k.includes("alto") || k.includes("ancho") || k.includes("grosor")) {
    page.drawCircle({ x: cx, y: cy, size: r * 0.9, borderColor: ORANGE, borderWidth: 1.5 });
  } else if (
    k.includes("2g") ||
    k.includes("3g") ||
    k.includes("4g") ||
    k.includes("5g") ||
    k.includes("wifi") ||
    k.includes("bluetooth") ||
    k.includes("nfc")
  ) {
    // Barras tipo señal
    for (let i = 0; i < 3; i++) {
      page.drawRectangle({
        x: cx - r + i * 5,
        y: cy - r * 0.6,
        width: 3,
        height: 4 + i * 4,
        color: ORANGE,
      });
    }
  } else if (k.includes("huella") || k.includes("sensor")) {
    page.drawCircle({ x: cx, y: cy, size: r * 0.9, borderColor: ORANGE, borderWidth: 1.5 });
    page.drawCircle({ x: cx, y: cy, size: r * 0.4, borderColor: ORANGE, borderWidth: 1 });
  } else {
    page.drawCircle({ x: cx, y: cy, size: r * 0.9, color: ORANGE });
  }
}

function resolveLocalImagePath(relPath) {
  if (!relPath) return null;
  const cleaned = relPath.startsWith("/") ? relPath.slice(1) : relPath;
  const full = path.join(IMAGE_ROOT, cleaned);
  return fs.existsSync(full) ? full : null;
}

async function embedProductImage(pdfDoc, relPath) {
  const filePath = resolveLocalImagePath(relPath);
  if (!filePath) return null;

  const bytes = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === ".png") return await pdfDoc.embedPng(bytes);
    if (ext === ".jpg" || ext === ".jpeg") return await pdfDoc.embedJpg(bytes);
    // .webp u otros formatos no soportados nativamente por pdf-lib: se omite.
    return null;
  } catch {
    return null;
  }
}

async function generatePDFs() {
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("🚀 Iniciando generación de PDFs (grid 5 columnas, vía pdf-lib)...");

  const files = fs
    .readdirSync(PRODUCTS_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));

  for (const file of files) {
    const content = fs.readFileSync(path.join(PRODUCTS_DIR, file), "utf-8");
    const { data } = matter(content);

    if (!data.specs || data.specs.length === 0) continue;

    const safeTitle = safeSlug(data.title);

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const gridWidth = PAGE_WIDTH - MARGIN_X * 2;
    const cardWidth = (gridWidth - GUTTER_X * (COLS - 1)) / COLS;

    const productImageSrc = data.mainImage || (data.images && data.images[0]);
    const embeddedImage = await embedProductImage(pdfDoc, productImageSrc);

    const drawFooter = (p) => {
      const footerText = "ExpansionTec Lima — Documento oficial generado automáticamente";
      const textWidth = fontRegular.widthOfTextAtSize(footerText, 8);
      p.drawText(footerText, {
        x: (PAGE_WIDTH - textWidth) / 2,
        y: 18,
        size: 8,
        font: fontRegular,
        color: FOOTER_GRAY,
      });
    };

    const drawTitleBar = (p) => {
      p.drawRectangle({
        x: MARGIN_X,
        y: PAGE_HEIGHT - MARGIN_TOP - 40,
        width: PAGE_WIDTH - MARGIN_X * 2,
        height: 40,
        color: CARD_BG,
        // borderColor: CARD_BORDER,
        // borderWidth: 1,
      });
      const titleText = data.title.toUpperCase();
      const titleSize = 20;
      const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
      p.drawText(titleText, {
        x: (PAGE_WIDTH - titleWidth) / 2,
        y: PAGE_HEIGHT - MARGIN_TOP - 27,
        size: titleSize,
        font: fontBold,
        color: DARK,
      });
      return PAGE_HEIGHT - MARGIN_TOP - 40 - 16; // y disponible debajo de la barra
    };

    const drawCard = (p, x, yTop, spec) => {
      p.drawRectangle({
        x,
        y: yTop - CARD_HEIGHT,
        width: cardWidth,
        height: CARD_HEIGHT,
        color: WHITE,
        borderColor: CARD_BORDER,
        borderWidth: 1,
      });

      const iconCx = x + cardWidth / 2;
      const iconCy = yTop - 16;
      drawSpecIcon(p, String(spec.key ?? ""), iconCx, iconCy);

      const valueText = String(spec.value ?? "");
      const valueSize = 12;
      const maxTextWidth = cardWidth - CARD_PADDING * 2;
      const valueLines = wrapText(valueText, fontBold, valueSize, maxTextWidth).slice(0, 2);

      let valueY = yTop - 34;
      for (const line of valueLines) {
        const lineWidth = fontBold.widthOfTextAtSize(line, valueSize);
        p.drawText(line, {
          x: x + (cardWidth - lineWidth) / 2,
          y: valueY,
          size: valueSize,
          font: fontBold,
          color: DARK,
        });
        valueY -= 13;
      }

      const keyText = String(spec.key ?? "");
      const keySize = 8;
      const keyLines = wrapText(keyText, fontRegular, keySize, maxTextWidth).slice(0, 2);
      let keyY = valueY - 4;
      for (const line of keyLines) {
        const lineWidth = fontRegular.widthOfTextAtSize(line, keySize);
        p.drawText(line, {
          x: x + (cardWidth - lineWidth) / 2,
          y: keyY,
          size: keySize,
          font: fontRegular,
          color: LABEL_GRAY,
        });
        keyY -= 10;
      }
    };

    // --- Layout de imagen (solo primera página) ---
    const IMAGE_COL_WIDTH = 200;
    const specsStartXFirstPage = embeddedImage
      ? MARGIN_X + IMAGE_COL_WIDTH + 20
      : MARGIN_X;
    const specsGridWidthFirstPage = PAGE_WIDTH - MARGIN_X - specsStartXFirstPage;
    const cardWidthFirstPage = embeddedImage
      ? (specsGridWidthFirstPage - GUTTER_X * (COLS - 1)) / COLS
      : cardWidth;

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // page.drawText((data.brand || "ExpansionTec").toUpperCase(), {
    //   x: MARGIN_X,
    //   y: PAGE_HEIGHT - MARGIN_TOP + 6,
    //   size: 9,
    //   font: fontBold,
    //   color: ORANGE,
    // });

    let y = drawTitleBar(page);

    if (embeddedImage) {
      const imgDims = embeddedImage.scale(1);
      const boxHeight = y - MARGIN_BOTTOM - 20;
      const scale = Math.min(
        IMAGE_COL_WIDTH / imgDims.width,
        boxHeight / imgDims.height,
        1
      );
      const drawW = imgDims.width * scale;
      const drawH = imgDims.height * scale;
      page.drawImage(embeddedImage, {
        x: MARGIN_X + (IMAGE_COL_WIDTH - drawW) / 2,
        y: y - boxHeight + (boxHeight - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    }

    // --- Grid de especificaciones con paginación ---
    const specs = data.specs;
    let specIndex = 0;
    let colIndex = 0;
    let rowTopY = y;
    let currentCardWidth = cardWidthFirstPage;
    let currentStartX = specsStartXFirstPage;
    let isFirstPage = true;

    while (specIndex < specs.length) {
      if (rowTopY - CARD_HEIGHT < MARGIN_BOTTOM + 24) {
        drawFooter(page);
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        page.drawText((data.brand || "ExpansionTec").toUpperCase(), {
          x: MARGIN_X,
          y: PAGE_HEIGHT - MARGIN_TOP + 6,
          size: 9,
          font: fontBold,
          color: ORANGE,
        });
        rowTopY = drawTitleBar(page);
        currentCardWidth = cardWidth;
        currentStartX = MARGIN_X;
        colIndex = 0;
        isFirstPage = false;
      }

      const x = currentStartX + colIndex * (currentCardWidth + GUTTER_X);
      drawCard(page, x, rowTopY, specs[specIndex]);

      specIndex++;
      colIndex++;

      const colsInRow = isFirstPage ? COLS : COLS;
      if (colIndex >= colsInRow) {
        colIndex = 0;
        rowTopY -= CARD_HEIGHT + GUTTER_Y;
      }
    }

    drawFooter(page);

    const pdfBytes = await pdfDoc.save();
    const pdfPath = path.join(OUTPUT_DIR, `${safeTitle}.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);
    console.log(`✅ PDF generado: ${pdfPath} (${specs.length} specs)`);
  }

  console.log("✨ Proceso terminado con éxito.");
}

generatePDFs().catch((err) => {
  console.error("❌ Error generando PDFs:", err);
  process.exit(1);
});
