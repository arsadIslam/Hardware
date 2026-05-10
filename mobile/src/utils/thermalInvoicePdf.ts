import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont } from 'pdf-lib';

export type ThermalInvoiceInput = {
  shopName: string;
  invoiceNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  lines: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  invoiceDiscount: number;
  grandTotal: number;
  paymentModeLabel: string;
  amountPaid: number | null;
  changeAmount: number | null;
  balanceDue: number | null;
  notes: string | null;
  printedAt: Date;
};

const PAGE_WIDTH_PT = Math.round((80 / 25.4) * 72);
const MARGIN = 10;
const BODY_W = PAGE_WIDTH_PT - 2 * MARGIN;
const LH = 9;
const FS = 7;
const FS_SMALL = 6;
const FS_TITLE = 10;

function fmtRs(n: number): string {
  return (
    'Rs.' +
    new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  );
}

function wrapToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [''];
  }
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      line = trial;
      continue;
    }
    if (line) {
      lines.push(line);
    }
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      line = word;
    } else {
      let chunk = '';
      for (const ch of word) {
        const next = chunk + ch;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) {
          chunk = next;
        } else {
          if (chunk) {
            lines.push(chunk);
          }
          chunk = ch;
        }
      }
      line = chunk;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

function sepLine(font: PDFFont, size: number): string {
  let n = 80;
  let dash = '-'.repeat(n);
  while (
    n > 10 &&
    font.widthOfTextAtSize(dash, size) > BODY_W
  ) {
    n -= 1;
    dash = '-'.repeat(n);
  }
  return dash;
}

function formatPrintedAt(d: Date): string {
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 80mm thermal receipt layout as PDF (narrow page — suitable for thermal / ESC-POS PDF pipelines).
 */
export async function buildThermalInvoicePdf(
  input: ThermalInvoiceInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  type Cmd =
    | { t: 'center'; s: string; bold?: boolean; fs?: number }
    | { t: 'left'; s: string; bold?: boolean; fs?: number }
    | { t: 'sep' }
    | { t: 'pair'; L: string; R: string; boldR?: boolean };

  const cmds: Cmd[] = [];

  cmds.push({
    t: 'center',
    s: input.shopName.toUpperCase(),
    bold: true,
    fs: FS_TITLE,
  });
  cmds.push({ t: 'center', s: 'Thermal invoice (PDF)', fs: FS_SMALL });
  cmds.push({ t: 'sep' });
  cmds.push({
    t: 'pair',
    L: 'Invoice',
    R: input.invoiceNumber,
    boldR: true,
  });
  cmds.push({
    t: 'pair',
    L: 'Printed',
    R: formatPrintedAt(input.printedAt),
  });

  const cust = [input.customerName, input.customerPhone]
    .filter(Boolean)
    .join(' · ');
  if (cust) {
    cmds.push({ t: 'left', s: `Customer: ${cust}`, fs: FS });
  }

  cmds.push({ t: 'sep' });
  cmds.push({ t: 'left', s: 'ITEMS', bold: true, fs: FS });

  for (const ln of input.lines) {
    const nameLines = wrapToWidth(ln.name, font, FS, BODY_W);
    for (const nl of nameLines) {
      cmds.push({ t: 'left', s: nl, fs: FS });
    }
    const detail = `${ln.sku}   ${ln.quantity} x ${fmtRs(ln.unitPrice)}`;
    cmds.push({ t: 'pair', L: detail, R: fmtRs(ln.lineTotal), boldR: true });
  }

  cmds.push({ t: 'sep' });
  cmds.push({
    t: 'pair',
    L: 'Subtotal',
    R: fmtRs(input.subtotal),
  });
  if (input.invoiceDiscount > 0) {
    cmds.push({
      t: 'pair',
      L: 'Discount',
      R: fmtRs(input.invoiceDiscount),
    });
  }
  cmds.push({
    t: 'pair',
    L: 'TOTAL',
    R: fmtRs(input.grandTotal),
    boldR: true,
  });
  cmds.push({
    t: 'pair',
    L: 'Payment',
    R: input.paymentModeLabel,
  });
  if (input.amountPaid != null && input.amountPaid > 0) {
    cmds.push({
      t: 'pair',
      L: 'Amount paid',
      R: fmtRs(input.amountPaid),
    });
  }
  if (input.changeAmount != null && input.changeAmount > 0) {
    cmds.push({
      t: 'pair',
      L: 'Change',
      R: fmtRs(input.changeAmount),
    });
  }
  if (input.balanceDue != null && input.balanceDue > 0) {
    cmds.push({
      t: 'pair',
      L: 'Balance due',
      R: fmtRs(input.balanceDue),
      boldR: true,
    });
  }
  if (input.notes?.trim()) {
    cmds.push({ t: 'sep' });
    cmds.push({
      t: 'left',
      s: `Notes: ${input.notes.trim()}`,
      fs: FS_SMALL,
    });
  }

  cmds.push({ t: 'sep' });
  cmds.push({
    t: 'center',
    s: 'Thank you — visit again',
    fs: FS_SMALL,
  });

  const pageHeight = Math.max(280, cmds.length * LH + 2 * MARGIN + 40);
  const page = doc.addPage([PAGE_WIDTH_PT, pageHeight]);
  const black = rgb(0, 0, 0);

  let y = pageHeight - MARGIN;

  const drawCenter = (txt: string, sz: number, f: PDFFont): void => {
    const w = f.widthOfTextAtSize(txt, sz);
    page.drawText(txt, {
      x: (PAGE_WIDTH_PT - w) / 2,
      y,
      size: sz,
      font: f,
      color: black,
    });
    y -= LH;
  };

  const drawLeft = (txt: string, sz: number, f: PDFFont): void => {
    page.drawText(txt, {
      x: MARGIN,
      y,
      size: sz,
      font: f,
      color: black,
    });
    y -= LH;
  };

  const drawPair = (
    left: string,
    right: string,
    boldRight: boolean,
  ): void => {
    const fL = font;
    const fR = boldRight ? fontBold : font;
    page.drawText(left, {
      x: MARGIN,
      y,
      size: FS,
      font: fL,
      color: black,
    });
    const rw = fR.widthOfTextAtSize(right, FS);
    page.drawText(right, {
      x: PAGE_WIDTH_PT - MARGIN - rw,
      y,
      size: FS,
      font: fR,
      color: black,
    });
    y -= LH;
  };

  for (const c of cmds) {
    if (c.t === 'sep') {
      drawLeft(sepLine(font, FS), FS, font);
      continue;
    }
    if (c.t === 'center') {
      const f = c.bold ? fontBold : font;
      const sz = c.fs ?? FS;
      drawCenter(c.s, sz, f);
      continue;
    }
    if (c.t === 'left') {
      const f = c.bold ? fontBold : font;
      const sz = c.fs ?? FS;
      drawLeft(c.s, sz, f);
      continue;
    }
    drawPair(c.L, c.R, c.boldR ?? false);
  }

  return doc.save();
}
