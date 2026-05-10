/** Digits only, suitable for https://wa.me/{digits} */
export function normalizeWhatsAppDigits(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 0) {
    return null;
  }
  // Indian mobile without country code
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    const rest = digits.slice(1);
    if (rest.length === 10 && /^[6-9]/.test(rest)) {
      return `91${rest}`;
    }
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }
  return null;
}

export type InvoiceShareLine = {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type BuildInvoiceMessageOpts = {
  shopName: string;
  invoiceNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  lines: InvoiceShareLine[];
  subtotal: number;
  invoiceDiscount: number;
  grandTotal: number;
  paymentModeLabel: string;
  amountPaid: number | null;
  changeAmount: number | null;
  balanceDue: number | null;
  notes: string | null;
  formatInr: (n: number) => string;
};

export function buildInvoiceMessage(o: BuildInvoiceMessageOpts): string {
  const fmt = o.formatInr;
  const lines = o.lines
    .map(
      (l, i) =>
        `${i + 1}. ${l.name} (${l.sku})\n   ${l.quantity} × ${fmt(l.unitPrice)} = ${fmt(l.lineTotal)}`,
    )
    .join('\n');

  let payBlock = `Payment: ${o.paymentModeLabel}`;
  if (o.amountPaid != null && o.amountPaid > 0) {
    payBlock += `\nPaid: ${fmt(o.amountPaid)}`;
  }
  if (o.changeAmount != null && o.changeAmount > 0) {
    payBlock += `\nChange: ${fmt(o.changeAmount)}`;
  }
  if (o.balanceDue != null && o.balanceDue > 0) {
    payBlock += `\nBalance due: ${fmt(o.balanceDue)}`;
  }

  const cust =
    o.customerName || o.customerPhone
      ? `Customer: ${[o.customerName, o.customerPhone].filter(Boolean).join(' · ')}\n`
      : '';

  const disc =
    o.invoiceDiscount > 0
      ? `Discount: ${fmt(o.invoiceDiscount)}\n`
      : '';

  const notes =
    o.notes && o.notes.trim() !== '' ? `Notes: ${o.notes.trim()}\n` : '';

  return (
    `${o.shopName}\n` +
    `Invoice ${o.invoiceNumber}\n` +
    `---\n` +
    cust +
    `${lines}\n` +
    `---\n` +
    `Subtotal: ${fmt(o.subtotal)}\n` +
    disc +
    `Total: ${fmt(o.grandTotal)}\n` +
    `${payBlock}\n` +
    notes
  ).trim();
}
