const { PDFDocument, StandardFonts, rgb } = PDFLib;

const btn = document.getElementById('generateBtn');
const imageInput = document.getElementById('imageInput') || { files: [] };

const v = id => {
  const el = document.getElementById(id);
  return el ? el.value : '';
};

/* =========================
   TEXT UTIL
========================= */
function cleanTextKeepLines(text) {
  if (!text) return '';
  return text.replace(/\r/g, '').trim();
}

function splitLines(text) {
  return cleanTextKeepLines(text)
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

/* =========================
   MULTILINE DRAW
========================= */
function drawMultiline(page, lines, x, y, w, size, font) {
  let cursorY = y;
  const gap = size + 4;

  for (let line of lines) {
    let current = '';
    for (let word of line.split(' ')) {
      const test = current + word + ' ';
      if (font.widthOfTextAtSize(test, size) > w) {
        page.drawText(current, { x, y: cursorY, size, font });
        cursorY -= gap;
        current = word + ' ';
      } else {
        current = test;
      }
    }
    if (current.trim()) {
      page.drawText(current, { x, y: cursorY, size, font });
      cursorY -= gap;
    }
  }
  return y - cursorY;
}

function measureMultiline(lines, w, size, font) {
  let h = 0;
  const gap = size + 4;
  for (let line of lines) {
    let cur = '';
    for (let word of line.split(' ')) {
      const test = cur + word + ' ';
      if (font.widthOfTextAtSize(test, size) > w) {
        h += gap;
        cur = word + ' ';
      } else cur = test;
    }
    h += gap;
  }
  return h;
}

/* =========================
   NORMAL BOX
========================= */
function box(page, label, value, x, y, w, fonts) {
  const pad = 6;
  const lines = splitLines(value);
  const textH = measureMultiline(lines, w - pad * 2, 8, fonts.reg);
  const h = Math.max(32, textH + 28);

  page.drawRectangle({
    x,
    y: y - h,
    width: w,
    height: h,
    borderWidth: 1,
    borderColor: rgb(0, 0, 0)
  });

  page.drawText(label.toUpperCase(), {
    x: x + pad,
    y: y - 12,
    size: 8,
    font: fonts.bold
  });

  drawMultiline(
    page,
    lines,
    x + pad,
    y - 24,
    w - pad * 2,
    8,
    fonts.reg
  );

  return h;
}

/* =========================
   RUMUSAN BOX
========================= */
function boxRumusan(page, x, y, w, fonts) {
  const pad = 6;

  const sections = [
    { label: 'Laporan', value: splitLines(v('laporan')) },
    { label: 'Kekuatan', value: splitLines(v('kekuatan')) },
    { label: 'Kelemahan', value: splitLines(v('kelemahan')) },
    { label: 'Penambahbaikan', value: splitLines(v('penambahbaikan')) }
  ];

  let totalH = 24;
  sections.forEach(s => {
    totalH += 12 + measureMultiline(s.value, w - pad * 2, 8, fonts.reg) + 8;
  });

  page.drawRectangle({
    x,
    y: y - totalH,
    width: w,
    height: totalH,
    borderWidth: 1,
    borderColor: rgb(0, 0, 0)
  });

  page.drawText('RUMUSAN AKTIVITI', {
    x: x + pad,
    y: y - 12,
    size: 8,
    font: fonts.bold
  });

  let cy = y - 26;
  sections.forEach(s => {
    page.drawText(s.label.toUpperCase() + ':', {
      x: x + pad,
      y: cy,
      size: 8,
      font: fonts.bold
    });
    cy -= 12;
    cy -= drawMultiline(
      page,
      s.value,
      x + pad,
      cy,
      w - pad * 2,
      8,
      fonts.reg
    ) + 8;
  });

  return totalH;
}

/* =========================
   GENERATE PDF
========================= */
btn.onclick = async () => {
  try {
    const res = await fetch('template.pdf');
    if (!res.ok) throw new Error('Template PDF gagal dimuatkan');

    const pdfDoc = await PDFDocument.load(await res.arrayBuffer());
    const page = pdfDoc.getPages()[0];

    const fonts = {
      reg: await pdfDoc.embedFont(StandardFonts.Helvetica),
      bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    };

    /* ALIGN WITH MAROON LINE */
    const x = 40;          // selari dengan tajuk
    const w = 270;
    const gap = 7;
    let y = 695;

    y -= box(page, `Nama ${v('pilihanLaporan')}`, v('namaLaporan'), x, y, w, fonts) + gap;
    y -= box(page, v('pilihanTahap'), v('tahapText'), x, y, w, fonts) + gap;
   // ===== TARIKH & MASA + TEMPAT / LOKASI (SEBARIS) =====
const halfGap = 6;
const halfW = (w - halfGap) / 2;

const h1 = box(
  page,
  'Tarikh & Masa',
  v('tarikhMasa'),
  x,
  y,
  halfW,
  fonts
);

const h2 = box(
  page,
  'Tempat / Lokasi',
  v('tempatLokasi'),
  x + halfW + halfGap,
  y,
  halfW,
  fonts
);

// turun sekali ikut box paling tinggi
y -= Math.max(h1, h2) + gap;

    y -= box(page, `Jumlah ${v('jenisKehadiran')}`, v('jumlahKehadiran'), x, y, w, fonts) + gap;
    y -= box(page, v('pilihanGuru'), v('namaGuru'), x, y, w, fonts) + gap;
    y -= boxRumusan(page, x, y, w, fonts);

    /* =========================
       FOOTER (SAFE A4 + DOTTED LINE)
    ========================= */
    const footerTextY = 78;
    const footerLineY = 60;

    page.drawText('DISEDIAKAN OLEH:', {
      x,
      y: footerTextY,
      size: 8,
      font: fonts.bold
    });

    page.drawText(cleanTextKeepLines(v('disediakanOleh')), {
      x,
      y: footerTextY - 14,
      size: 8,
      font: fonts.reg
    });

    // DOTTED LINE (standard report style)
   const AUTHOR_LINE_W = 170; // panjang sesuai untuk nama penulis

page.drawLine({
  start: { x, y: footerLineY },
  end:   { x: x + AUTHOR_LINE_W, y: footerLineY },
  thickness: 1,
  color: rgb(0, 0, 0),
  dashArray: [3, 3]
});


    /* =========================
       IMAGES – RIGHT COLUMN
    ========================= */
    let imgY = 695;
    const IMG_X = 350;
    const IMG_W = 210;
    const IMG_H = 120;
    const IMG_GAP = 10;

    for (let file of [...imageInput.files].slice(0, 4)) {
      const img = file.type.includes('png')
        ? await pdfDoc.embedPng(await file.arrayBuffer())
        : await pdfDoc.embedJpg(await file.arrayBuffer());

      const scale = Math.min(IMG_W / img.width, IMG_H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;

      page.drawImage(img, {
        x: IMG_X + (IMG_W - dw) / 2,
        y: imgY - dh,
        width: dw,
        height: dh
      });

      imgY -= dh + IMG_GAP;
    }

    const name = cleanTextKeepLines(v('namaLaporan'))
      .toUpperCase()
      .replace(/\s+/g, '_') || 'LAPORAN';

    const year = (v('tarikhMasa').match(/20\d{2}/) || ['2026'])[0];

    const blob = new Blob([await pdfDoc.save()], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `OPR_${name}_${year}.pdf`;
    a.click();

  } catch (e) {
    console.error(e);
    alert('Ralat semasa jana PDF');
  }
};
