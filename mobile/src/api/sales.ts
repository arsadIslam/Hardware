import axios from 'axios';

import { httpClient } from './httpClient';
import { getApiErrorMessage } from '../utils/apiErrors';

export type SaleLineInput = {
  product_id: number;
  quantity: number;
  unit_price: number;
};

export type CreateSalePayload = {
  customer_id?: number;
  customer?: {
    name: string;
    phone: string;
    address?: string | null;
  };
  lines: SaleLineInput[];
  discount_type?: 'percent' | 'fixed' | null;
  discount_value?: number | null;
  payment_mode: 'cash' | 'upi' | 'partial' | 'due';
  amount_paid?: number | null;
  notes?: string | null;
};

export type CreatedInvoice = {
  id: number;
  invoice_number: string | null;
  total: string | number;
  amount_paid?: string | number;
  balance_due?: string | number;
};

export type CreateSaleResponse = {
  message: string;
  invoice: CreatedInvoice;
};

function buildJsonBody(payload: CreateSalePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    lines: payload.lines,
    payment_mode: payload.payment_mode,
  };
  if (payload.customer_id != null) {
    body.customer_id = payload.customer_id;
  }
  if (payload.customer) {
    body.customer = payload.customer;
  }
  if (payload.discount_type != null && payload.discount_value != null) {
    body.discount_type = payload.discount_type;
    body.discount_value = payload.discount_value;
  }
  if (payload.amount_paid != null && !Number.isNaN(payload.amount_paid)) {
    body.amount_paid = payload.amount_paid;
  }
  if (payload.notes != null && payload.notes !== '') {
    body.notes = payload.notes;
  }
  return body;
}

export async function createSale(
  payload: CreateSalePayload,
): Promise<CreateSaleResponse> {
  const { data } = await httpClient.post<CreateSaleResponse>(
    '/sales',
    buildJsonBody(payload),
  );
  return data;
}

export function getSaleErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const raw = err.response.data as {
      message?: string;
      availability?: Array<{
        name?: string;
        requested?: number;
        available?: number;
      }>;
    };
    if (raw.availability && raw.availability.length > 0) {
      const bits = raw.availability.map((a) => {
        const name = a.name ?? 'Product';
        return `${name}: requested ${a.requested ?? '?'}, available ${a.available ?? '?'}`;
      });
      return [raw.message ?? 'Insufficient stock.', ...bits].join('\n');
    }
  }
  return getApiErrorMessage(err, 'Could not record sale.');
}
