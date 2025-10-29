// Requires: npm install pdf-lib canvas
// Usage: node generate-card-sheets.js

import fs from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';
import { createCanvas, loadImage } from 'canvas';

/**
 * loads a directory of cards and place the ones with +.png in the backs array and the ones without in the fronts array
 */
async function getCardsFromDirectory(directory) {
  const files = fs.readdirSync(directory);
  const fronts = [];
  const backs = [];
  for (const file of files) {
    if (file.endsWith('.png')) {
      if (file.endsWith('+.png')) {
        backs.push(directory + '/' + file);
      } else {
        fronts.push(directory + '/' + file);
      }
    }
  }
  return { fronts, backs };
}

async function generatePrintSheets({
  fronts,
  backs,
  outputFrontPDF = 'cards_fronts.pdf',
  outputBackPDF = 'cards_backs.pdf',
  cardSizeIn = [2.5, 3.5], // inches (width, height)
  pageSizeIn = [12, 18],  // Letter size
  // pageSizeIn = [8.5, 11],  // Letter size
  marginIn = 1,
  spacingIn = 0.5,
  bleedIn = 0,
  dpi = 300,
  frontBgColor = null, // e.g. { r: 1, g: 1, b: 1 } or rgb(1, 1, 1)
  backBgColor = null,  // e.g. { r: 0.9, g: 0.9, b: 1 } or rgb(0.9, 0.9, 1)
  frontMarkColor = rgb(0, 0, 0), // Black marks by default
  backMarkColor = rgb(0, 0, 0),  // Black marks by default
}) {
  const inchToPt = (inch) => inch * 72;
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

  // Calculate total grid size for centering
  const totalGridWidth = cols * cardW + (cols - 1) * spacing;
  const totalGridHeight = rows * cardH + (rows - 1) * spacing;
  
  // Calculate starting position to center the grid
  const startX = (pageWidth - totalGridWidth) / 2;
  const startY = (pageHeight - totalGridHeight) / 2;

  /**
   * Layout function: draw all cards in grid.
   * If `mirrorRows` = true, flips each row horizontally (for back sides).
   */
  const layoutPages = async (images, mirrorRows = false, bgColor = null, markColor = rgb(0, 0, 0)) => {
    const pdf = await PDFDocument.create();

    for (let p = 0; p < Math.ceil(images.length / perPage); p++) {
      const page = pdf.addPage([pageWidth, pageHeight]);
      
      // Draw background color if specified
      if (bgColor) {
        page.drawRectangle({
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          color: bgColor,
        });
      }
      
      const slice = images.slice(p * perPage, (p + 1) * perPage);

      for (let i = 0; i < slice.length; i++) {
        let col = i % cols;
        const row = Math.floor(i / cols);

        // Invert the order of cards in each row for backs
        if (mirrorRows) col = cols - 1 - col;

        const x = startX + col * (cardW + spacing);
        const y = startY + (rows - 1 - row) * (cardH + spacing);

        const imgBytes = fs.readFileSync(slice[i]);
        let embed;
        if (slice[i].toLowerCase().endsWith('.png')) embed = await pdf.embedPng(imgBytes);
        else embed = await pdf.embedJpg(imgBytes);

        page.drawImage(embed, { x, y, width: cardW, height: cardH });

        // --- Crop marks ---
        const markLen = 15;
        const drawLine = (x1, y1, x2, y2) =>
          page.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            color: markColor,
            thickness: 0.5,
          });

        // corner marks
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
      }
    }
    return pdf;
  };

  // Fronts: normal order
  const frontsPDF = await layoutPages(fronts, false, frontBgColor, frontMarkColor);
  // Backs: mirror each row horizontally
  const backsPDF = await layoutPages(backs, true, backBgColor, backMarkColor);

  fs.writeFileSync(outputFrontPDF, await frontsPDF.save());
  fs.writeFileSync(outputBackPDF, await backsPDF.save());
  console.log(`✅ Generated: ${outputFrontPDF}, ${outputBackPDF}`);
}

// ---- Demo with placeholders ----
(async () => {
  // const count = 8;
  // for (let i = 0; i < count; i++) {
  //   const c = createCanvas(500, 700);
  //   const ctx = c.getContext('2d');
  //   ctx.fillStyle = `hsl(${i * 45}, 60%, 60%)`;
  //   ctx.fillRect(0, 0, c.width, c.height);
  //   // ctx.fillStyle = 'white';
  //   ctx.font = 'bold 40px sans-serif';
  //   ctx.textAlign = 'center';
  //   ctx.textBaseline = 'middle';
  //   ctx.fillText(`FRONT ${i + 1}`, c.width / 2, c.height / 2);
  //   const f = `front_${i + 1}.png`;
  //   fs.writeFileSync(f, c.toBuffer('image/png'));
  //   fronts.push(f);

  //   const cb = createCanvas(500, 700);
  //   const bctx = cb.getContext('2d');
  //   bctx.fillStyle = `hsl(${(i * 45 + 180) % 360}, 50%, 50%)`;
  //   bctx.fillRect(0, 0, cb.width, cb.height);
  //   // bctx.fillStyle = 'white';
  //   bctx.font = 'bold 40px sans-serif';
  //   bctx.textAlign = 'center';
  //   bctx.textBaseline = 'middle';
  //   bctx.fillText(`BACK ${i + 1}`, cb.width / 2, cb.height / 2);
  //   const b = `back_${i + 1}.png`;
  //   fs.writeFileSync(b, cb.toBuffer('image/png'));
  //   backs.push(b);
  // }

  const { fronts: frontsWatcher, backs: backsWatcher } = await getCardsFromDirectory('sts-cards/watcher');

  await generatePrintSheets({ 
    fronts: frontsWatcher, 
    backs: backsWatcher,
    // Optional: set background colors (RGB values 0-1)
    frontBgColor: rgb(0, 0, 0),                 // black
    backBgColor: rgb(108/255, 13/255, 190/255), // purple
    // backBgColor: rgb(1, 1, 1), // white
    // Optional: set mark colors (RGB values 0-1)
    frontMarkColor: rgb(1, 1, 1),               // white marks
    backMarkColor: rgb(1, 1, 1),                // white marks
    outputFrontPDF: 'cards_fronts_watcher.pdf',
    outputBackPDF: 'cards_backs_watcher.pdf',
  });

  const { fronts: frontsSilent, backs: backsSilent } = await getCardsFromDirectory('sts-cards/silent');
  await generatePrintSheets({ 
    fronts: frontsSilent, 
    backs: backsSilent,
    // Optional: set background colors (RGB values 0-1)
    frontBgColor: rgb(0, 0, 0),                 // black
    backBgColor: rgb(62/255, 95/255, 56/255), // purple
    // backBgColor: rgb(1, 1, 1), // white
    // Optional: set mark colors (RGB values 0-1)
    frontMarkColor: rgb(1, 1, 1),               // white marks
    backMarkColor: rgb(1, 1, 1),                // white marks
    outputFrontPDF: 'cards_fronts_silent.pdf',
    outputBackPDF: 'cards_backs_silent.pdf',
  });
})();
