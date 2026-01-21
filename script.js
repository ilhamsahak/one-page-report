const { PDFDocument, StandardFonts, rgb } = PDFLib;

const btn = document.getElementById('generateBtn');
const imageInput = document.getElementById('imageInput');

const v = id => document.getElementById(id)?.value || '-';

/* WORD WRAP */
function wrap(page, text, x, y, w, size, font) {
  const words = text.split(' ');
  let line = '';
  let offset = 0;

  for (let word of words) {
    const test = line + word + ' ';
    if (font.widthOfTextAtSize(test, size) > w) {
      page.drawText(line, { x, y: y - offset, size, font });
      line = word + ' ';
      offset += size + 3;
    } else {
      line = test;
    }
  }

  page.drawText(line, { x, y: y - offset, size, font });
  return offset + size;
}

/* DRAW BOX */
function box(page, label, value, x, y, w, fonts) {
  const pad = 6;
  const minHeight = 32;

  const textHeight = wrap(
    page,
    value,
    x + pad,
    y - 20,
    w - pad * 2,
    8,
    fonts.reg
  );

  const h = Math.max(minHeight, textHeight + 26);

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

  return h;
}

/* GENERATE PDF */
btn.onclick = async () => {
  try {
    const pdfDoc = await PDFDocument.load(
      await fetch('template.pdf').then(r => r.arrayBuffer())
    );

    const page = pdfDoc.getPages()[0];

    const fonts = {
      reg: await pdfDoc.embedFont(StandardFonts.Helvetica),
      bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    };

    /* 🔥 FINAL ALIGNMENT FIX */
    const x = 58;        // ⬅️ SELARI TEPAT DENGAN "ONE PAGE REPORT"
    let y = 695;
    const w = 270;
    const gap = 7;

    /* LEFT COLUMN */
    y -= box(page, 'Pilihan Laporan', v('pilihanLaporan'), x, y, w, fonts) + gap;
    y -= box(page, 'Nama Program / Aktiviti / PLC', v('namaLaporan'), x, y, w, fonts) + gap;
    y -= box(page, 'Tahap', `${v('pilihanTahap')} - ${v('tahapText')}`, x, y, w, fonts) + gap;
    y -= box(page, 'Tarikh & Masa', v('tarikhMasa'), x, y, w, fonts) + gap;
    y -= box(page, 'Tempat / Lokasi', v('tempatLokasi'), x, y, w, fonts) + gap;
    y -= box(page, v('jenisKehadiran'), v('jumlahKehadiran'), x, y, w, fonts) + gap;
    y -= box(page, 'Pilihan Guru', v('pilihanGuru'), x, y, w, fonts) + gap;
    y -= box(page, 'Nama Guru', v('namaGuru'), x, y, w, fonts) + gap;

    const rumusan =
      `Laporan: ${v('laporan')} ` +
      `Kekuatan: ${v('kekuatan')} ` +
      `Kelemahan: ${v('kelemahan')} ` +
      `Penambahbaikan: ${v('penambahbaikan')}`;

    y -= box(page, 'Rumusan Aktiviti', rumusan, x, y, w, fonts) + gap;

    /* FOOTER */
    page.drawText('DISEDIAKAN OLEH:', {
      x,
      y: 134,
      size: 8,
      font: fonts.bold
    });
    page.drawText(v('disediakanOleh'), {
      x,
      y: 120,
      size: 8,
      font: fonts.reg
    });

    /* RIGHT COLUMN IMAGES (EQUAL SPACING) */
    const top = 695;
    const bottom = 120;
    const slots = 4;
    const slotH = (top - bottom) / slots;
    const imgX = 360;
    const imgW = 180;
    const padding = 6;

    const files = [...imageInput.files].slice(0, 4);

    for (let i = 0; i < slots; i++) {
      if (!files[i]) continue;

      const bytes = await files[i].arrayBuffer();
      const img = files[i].type.includes('png')
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);

      const maxH = slotH - padding * 2;
      const scale = Math.min(
        imgW / img.width,
        maxH / img.height
      );

      const wImg = img.width * scale;
      const hImg = img.height * scale;

      page.drawImage(img, {
        x: imgX + (imgW - wImg) / 2,
        y: top - slotH * i - padding - hImg,
        width: wImg,
        height: hImg
      });
    }

    const blob = new Blob([await pdfDoc.save()], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'OPR_One_Page_Report.pdf';
    a.click();

  } catch (e) {
    console.error(e);
    alert('Ralat semasa jana PDF');
  }
};
