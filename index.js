// Requires: npm install pdf-lib canvas
// Usage: node generate-card-sheets.js

import fs from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';
import { createCanvas, loadImage } from 'canvas';

const fronts = ['sts-cards/Bowling_Bash.png'];
const backs = ['sts-cards/Bowling_Bash+.png'];
async function generatePrintSheets({
  fronts,
  backs,
  outputFrontPDF = 'cards_fronts.pdf',
  outputBackPDF = 'cards_backs.pdf',
  cardSizeIn = [2.5, 3.5], // inches (width, height)
  pageSizeIn = [8.5, 11],  // Letter size
  marginIn = 0.25,
  spacingIn = 0.125,
  bleedIn = 0.125,
  dpi = 300,
}) {
  const inchToPt = (inch) => inch * 72; // PDF uses points (1pt = 1/72in)
  const pageWidth = inchToPt(pageSizeIn[0]);
  const pageHeight = inchToPt(pageSizeIn[1]);
  const cardW = inchToPt(cardSizeIn[0]);
  const cardH = inchToPt(cardSizeIn[1]);
  const margin = inchToPt(marginIn);
  const spacing = inchToPt(spacingIn);
  const bleed = inchToPt(bleedIn);

  const usableW = pageWidth - 2 * margin + spacing;
  const usableH = pageHeight - 2 * margin + spacing;
  const cols = Math.floor(usableW / (cardW + spacing));
  const rows = Math.floor(usableH / (cardH + spacing));
  const perPage = cols * rows;

  const layoutPages = async (images) => {
    const pdf = await PDFDocument.create();
    for (let p = 0; p < Math.ceil(images.length / perPage); p++) {
      const page = pdf.addPage([pageWidth, pageHeight]);
      const ctx = page;
      const slice = images.slice(p * perPage, (p + 1) * perPage);

      for (let i = 0; i < slice.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + col * (cardW + spacing);
        const y = pageHeight - margin - (row + 1) * cardH - row * spacing;

        const img = await loadImage(slice[i]);
        const canvas = createCanvas(cardW, cardH);
        const cctx = canvas.getContext('2d');
        cctx.drawImage(img, 0, 0, cardW, cardH);
        const imgBytes = canvas.toBuffer('image/jpeg');
        const embed = await pdf.embedJpg(imgBytes);
        page.drawImage(embed, { x, y, width: cardW, height: cardH });

        // Crop marks and center crosshair
        const markLen = 8; // points
        const markColor = rgb(0, 0, 0);
        const cx = x + cardW / 2;
        const cy = y + cardH / 2;

        // corner marks
        const drawLine = (x1, y1, x2, y2) => page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color: markColor, thickness: 0.5 });
        // top-left
        drawLine(x - bleed - markLen, y + cardH + bleed, x - bleed, y + cardH + bleed);
        drawLine(x - bleed, y + cardH + bleed, x - bleed, y + cardH + bleed + markLen);
        // top-right
        drawLine(x + cardW + bleed, y + cardH + bleed, x + cardW + bleed + markLen, y + cardH + bleed);
        drawLine(x + cardW + bleed, y + cardH + bleed, x + cardW + bleed, y + cardH + bleed + markLen);
        // bottom-left
        drawLine(x - bleed - markLen, y - bleed, x - bleed, y - bleed);
        drawLine(x - bleed, y - bleed - markLen, x - bleed, y - bleed);
        // bottom-right
        drawLine(x + cardW + bleed, y - bleed, x + cardW + bleed + markLen, y - bleed);
        drawLine(x + cardW + bleed, y - bleed - markLen, x + cardW + bleed, y - bleed);
        // center crosshair
        drawLine(cx - 4, cy, cx + 4, cy);
        drawLine(cx, cy - 4, cx, cy + 4);
      }
    }
    return pdf;
  };

  const frontsPDF = await layoutPages(fronts);
  const backsPDF = await layoutPages(backs);

  fs.writeFileSync(outputFrontPDF, await frontsPDF.save());
  fs.writeFileSync(outputBackPDF, await backsPDF.save());
  console.log(`✅ Generated: ${outputFrontPDF}, ${outputBackPDF}`);
}

// ---- Example run with placeholder images ----
(async () => {
  // You can replace these with your own file paths

  const count = 8;
  for (let i = 0; i < count; i++) {
    // generate colored placeholders
    const c = createCanvas(1000, 1000);
    const ctx = c.getContext('2d');
    ctx.fillStyle = `hsl(${i * 45}, 60%, 60%)`;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`FRONT ${i + 1}`, c.width / 2, c.height / 2);
    const frontPath = `front_${i + 1}.jpg`;
    fs.writeFileSync(frontPath, c.toBuffer('image/jpeg'));
    fronts.push(frontPath);

    const cb = createCanvas(300, 420);
    const cctx = cb.getContext('2d');
    cctx.fillStyle = `hsl(${(i * 45 + 180) % 360}, 50%, 50%)`;
    cctx.fillRect(0, 0, cb.width, cb.height);
    cctx.fillStyle = 'white';
    cctx.font = 'bold 40px sans-serif';
    cctx.textAlign = 'center';
    cctx.textBaseline = 'middle';
    cctx.fillText(`BACK ${i + 1}`, cb.width / 2, cb.height / 2);
    const backPath = `back_${i + 1}.jpg`;
    fs.writeFileSync(backPath, cb.toBuffer('image/jpeg'));
    backs.push(backPath);
  }

  await generatePrintSheets({ fronts, backs });
})();
