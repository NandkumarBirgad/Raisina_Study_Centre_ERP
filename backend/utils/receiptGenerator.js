import PDFDocument from 'pdfkit';
import fs from 'fs';

// ─── CONFIG ───────────────────────────────────────────────
const PINK        = '#C8185A';
const LIGHT_PINK  = '#F5D0E0';
const DARK        = '#1A1A1A';
const GREY        = '#888888';

// ─── HELPERS ─────────────────────────────────────────────
function amountToWords(amount) {
  const num = Math.floor(amount);
  if (num === 0) return 'Zero Rupees';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function words(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + words(n%100) : '');
    if (n < 100000) return words(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + words(n%1000) : '');
    if (n < 10000000) return words(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + words(n%100000) : '');
    return words(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + words(n%10000000) : '');
  }
  return words(num) + ' Rupees';
}

// ─── DRAW ONE STUB ────────────────────────────────────────
// x, y = top-left corner; w = width; h = height
function drawStub(doc, x, y, w, h, data, isOfficeCopy) {
  const pad = 14;
  const innerW = w - pad * 2;

  // --- Vertical stripe lines (decorative background) ---
  doc.save();
  doc.rect(x, y, w, h).clip();
  doc.strokeColor(LIGHT_PINK).lineWidth(0.5);
  for (let sx = x + 6; sx < x + w; sx += 7) {
    doc.moveTo(sx, y).lineTo(sx, y + h).stroke();
  }
  doc.restore();

  // --- Outer border ---
  doc.rect(x, y, w, h).lineWidth(1.5).strokeColor(PINK).stroke();

  // ── HEADER ──
  const logoR = 22;
  const logoX = x + pad + logoR;
  const logoY = y + pad + logoR;

  // Left circle logo
  doc.circle(logoX, logoY, logoR).lineWidth(1.5).strokeColor(PINK).stroke();
  doc.fontSize(5.5).font('Helvetica-Bold').fillColor(PINK)
    .text('RAISINA', logoX - 14, logoY - 9, { width: 28, align: 'center' });
  doc.text('FOUNDATION', logoX - 14, logoY - 3, { width: 28, align: 'center' });

  // Right circle logo
  const logoX2 = x + w - pad - logoR;
  doc.circle(logoX2, logoY, logoR).lineWidth(1.5).strokeColor(PINK).stroke();
  doc.fontSize(5).font('Helvetica-Bold').fillColor(PINK)
    .text('RAISINA', logoX2 - 14, logoY - 6, { width: 28, align: 'center' });
  doc.fontSize(4.5).text('STUDY CENTER', logoX2 - 14, logoY, { width: 28, align: 'center' });

  // Center header text
  const centerX = x + w / 2;
  const headX   = x + logoR * 2 + pad + 6;
  const headW   = w - (logoR * 2 + pad + 6) * 2;

  doc.fontSize(9).font('Helvetica-Bold').fillColor(PINK)
    .text('RAISINA FOUNDATION', headX, y + pad + 2, { width: headW, align: 'center' });
  doc.fontSize(6.5).font('Helvetica').fillColor(DARK)
    .text('Reg.No.:F-0026526', headX, y + pad + 14, { width: headW, align: 'center' });
  doc.fontSize(11).font('Helvetica-Bold').fillColor(PINK)
    .text('RAISINA STUDY CENTER', headX, y + pad + 22, { width: headW, align: 'center' });

  // Header separator
  const sepY = y + 62;
  doc.moveTo(x + pad, sepY).lineTo(x + w - pad, sepY).lineWidth(1).strokeColor(PINK).stroke();

  // ── COPY LABEL (subtle, top-right corner) ──
  const label = isOfficeCopy ? 'Office Copy' : 'Donor Copy';
  doc.fontSize(6).font('Helvetica').fillColor(GREY)
    .text(label, x + w - pad - 45, y + 4, { width: 44, align: 'right' });

  // ── FIELDS ──
  let fy = sepY + 10;
  const labelFont  = 'Helvetica-Bold';
  const valueFont  = 'Helvetica';
  const fieldFSize = 8.5;
  const dotColor   = PINK;
  const lineH      = 20;

  function dotLine(lx, ly, lw) {
    doc.save();
    doc.dash(1, { space: 3 });
    doc.moveTo(lx, ly).lineTo(lx + lw, ly).lineWidth(0.5).strokeColor(dotColor).stroke();
    doc.undash();
    doc.restore();
  }

  function field(label, value, lx, ly, lw) {
    doc.fontSize(fieldFSize).font(labelFont).fillColor(DARK).text(label, lx, ly);
    const labelW = doc.widthOfString(label);
    const vx = lx + labelW + 3;
    const vw = lw - labelW - 3;
    if (value) {
      doc.fontSize(fieldFSize).font(valueFont).fillColor(DARK).text(value, vx, ly, { width: vw });
    }
    dotLine(vx, ly + 11, vw);
  }

  // Row 1: Receipt No. | Date
  field('Receipt No.', data.receiptNumber ? String(data.receiptNumber) : '', x + pad, fy, innerW * 0.52);
  field('Date :', data.date ? new Date(data.date).toLocaleDateString('en-IN') : '   /   /', x + pad + innerW * 0.56, fy, innerW * 0.44);

  fy += lineH;
  field('Name of Donor', data.donorName || '', x + pad, fy, innerW);

  fy += lineH;
  field('Address of Donor', data.address || '', x + pad, fy, innerW);

  fy += lineH;
  field('Donation Amount Rs. in words', data.amount ? amountToWords(data.amount) : '', x + pad, fy, innerW);

  // Second words line (overflow / continuation dotted line)
  fy += lineH - 4;
  dotLine(x + pad, fy + 11, innerW);

  // ── AMOUNT BOX + THANK YOU ──
  fy += 18;
  const boxX = x + pad;
  const boxY = fy;
  const boxW = innerW * 0.42;
  const boxH = 26;

  // Pink rupee symbol box
  doc.rect(boxX, boxY, boxW, boxH).fillAndStroke(PINK, PINK);
  // White rupee symbol
  doc.fontSize(14).font('Helvetica-Bold').fillColor('white')
    .text('\u20B9', boxX + 4, boxY + 5, { width: 18, align: 'left' });
  // Amount value area (white box inside)
  const amtBoxX = boxX + 24;
  doc.rect(amtBoxX, boxY + 2, boxW - 26, boxH - 4).fillAndStroke('white', 'white');
  if (data.amount) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK)
      .text(Number(data.amount).toLocaleString('en-IN'), amtBoxX + 2, boxY + 7, { width: boxW - 30 });
  }

  // Thank You
  doc.fontSize(13).font('Helvetica-BoldOblique').fillColor(PINK)
    .text('Thank You...', x + pad + boxW + 10, boxY + 4, { width: innerW - boxW - 10 });

  // ── SIGNATURES ──
  fy = boxY + boxH + 16;
  doc.moveTo(x + pad, fy).lineTo(x + w - pad, fy).lineWidth(0.7).strokeColor(PINK).stroke();
  fy += 4;

  doc.fontSize(8).font(labelFont).fillColor(DARK)
    .text('Authorised Sign.', x + pad, fy, { width: innerW * 0.5 });
  doc.text('Donor sign.', x + pad + innerW * 0.5, fy, { width: innerW * 0.5, align: 'right' });
}

// ─── MAIN EXPORT ─────────────────────────────────────────
export function generateDonationReceipt(stream, data) {
  // A5 landscape = 595 × 420 pt (fits two stubs side by side nicely)
  const pageW = 595;
  const pageH = 420;
  const doc   = new PDFDocument({ size: [pageW, pageH], margin: 0 });
  doc.pipe(stream);

  const stubW  = pageW / 2 - 4;   // slight gap in the middle
  const stubH  = pageH - 20;
  const topY   = 10;

  // Left stub  = office copy
  drawStub(doc, 4,            topY, stubW, stubH, data, true);
  // Perforated centre line
  doc.save();
  doc.dash(3, { space: 4 });
  doc.moveTo(pageW / 2, topY).lineTo(pageW / 2, topY + stubH)
    .lineWidth(0.8).strokeColor(GREY).stroke();
  doc.undash();
  doc.restore();
  // Right stub = donor copy
  drawStub(doc, pageW / 2 + 4, topY, stubW, stubH, data, false);

  doc.end();
}

// ─── QUICK TEST ──────────────────────────────────────────
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const out = fs.createWriteStream('/mnt/user-data/outputs/sample_donation_receipt.pdf');
  generateDonationReceipt(out, {
    receiptNumber : 1511,
    date          : new Date(),
    donorName     : 'Rahul Sharma',
    address       : '42 MG Road, Pune - 411001',
    amount        : 5100,
    centerName    : 'Raisina Study Center',
  });
  out.on('finish', () => console.log('Receipt generated!'));
}
