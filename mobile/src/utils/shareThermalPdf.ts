import RNFS from 'react-native-fs';
import Share from 'react-native-share';

import {
  buildThermalInvoicePdf,
  type ThermalInvoiceInput,
} from './thermalInvoicePdf';

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** RN-safe base64 (no dependency on `btoa`). */
function uint8ToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i]!;
    const b2 = i + 1 < len ? bytes[i + 1]! : 0;
    const b3 = i + 2 < len ? bytes[i + 2]! : 0;
    const triple = b1 * 65536 + b2 * 256 + b3;
    const pad = i + 1 >= len ? 2 : i + 2 >= len ? 1 : 0;
    const i0 = Math.floor(triple / 262144) % 64;
    const i1 = Math.floor(triple / 4096) % 64;
    const i2 = Math.floor(triple / 64) % 64;
    const i3 = triple % 64;
    result += B64[i0];
    result += B64[i1];
    result += pad >= 2 ? '=' : B64[i2];
    result += pad >= 1 ? '=' : B64[i3];
  }
  return result;
}

function safePdfFilename(invoiceNumber: string): string {
  const base = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `Invoice_${base || 'sale'}.pdf`;
}

/**
 * Writes an 80mm-style thermal PDF to cache and opens the share sheet (pick printer / thermal apps / Save).
 */
export async function shareThermalInvoicePdf(
  input: ThermalInvoiceInput,
): Promise<void> {
  const bytes = await buildThermalInvoicePdf(input);
  const filename = safePdfFilename(input.invoiceNumber);
  const path = `${RNFS.CachesDirectoryPath}/${filename}`;
  await RNFS.writeFile(path, uint8ToBase64(bytes), 'base64');

  const fileUrl = path.startsWith('file://') ? path : `file://${path}`;

  await Share.open({
    url: fileUrl,
    type: 'application/pdf',
    filename,
    title: 'Thermal invoice PDF',
    failOnCancel: false,
    subject: `${input.shopName} — ${input.invoiceNumber}`,
  });
}
