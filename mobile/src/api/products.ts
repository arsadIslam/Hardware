import { httpClient } from './httpClient';

export type Product = {
  id: number;
  product_id: string;
  name: string;
  selling_price: string | number;
  buying_price: string | number | null;
  available_quantity: string | number;
  quantity_unit: string | null;
  location: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PaginatedProducts = {
  data: Product[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export async function fetchProductsPage(params: {
  page?: number;
  perPage?: number;
  search?: string;
}): Promise<PaginatedProducts> {
  const { page = 1, perPage = 15, search } = params;
  const { data } = await httpClient.get<PaginatedProducts>('/products', {
    params: {
      page,
      per_page: perPage,
      ...(search != null && search !== '' ? { search } : {}),
    },
  });
  return data;
}

export type CreateProductPayload = {
  /** Omit for server-generated SKU (HW-000001, …). */
  product_id?: string;
  name: string;
  selling_price: number;
  buying_price?: number | null;
  available_quantity: number;
  quantity_unit?: string | null;
  location?: string | null;
};

export async function createProduct(
  payload: CreateProductPayload,
): Promise<Product> {
  const body: Record<string, unknown> = {
    name: payload.name.trim(),
    selling_price: payload.selling_price,
    available_quantity: payload.available_quantity,
  };
  const sku = payload.product_id?.trim();
  if (sku) {
    body.product_id = sku;
  }
  const bp = payload.buying_price;
  if (bp != null && !Number.isNaN(bp)) {
    body.buying_price = bp;
  } else {
    body.buying_price = null;
  }
  const qu = payload.quantity_unit?.trim();
  body.quantity_unit = qu !== '' ? qu : null;
  const loc = payload.location?.trim();
  body.location = loc !== '' ? loc : null;

  const { data } = await httpClient.post<Product>('/products', body);
  return data;
}

export type UpdateProductPayload = {
  product_id: string;
  name: string;
  selling_price: number;
  buying_price?: number | null;
  available_quantity: number;
  quantity_unit?: string | null;
  location?: string | null;
};

export async function fetchProduct(id: number): Promise<Product> {
  const { data } = await httpClient.get<Product>(`/products/${id}`);
  return data;
}

export async function updateProduct(
  id: number,
  payload: UpdateProductPayload,
): Promise<Product> {
  const body: Record<string, unknown> = {
    product_id: payload.product_id.trim(),
    name: payload.name.trim(),
    selling_price: payload.selling_price,
    available_quantity: payload.available_quantity,
  };
  const bp = payload.buying_price;
  if (bp != null && !Number.isNaN(bp)) {
    body.buying_price = bp;
  } else {
    body.buying_price = null;
  }
  const qu = payload.quantity_unit?.trim();
  body.quantity_unit = qu !== '' ? qu : null;
  const loc = payload.location?.trim();
  body.location = loc !== '' ? loc : null;

  const { data } = await httpClient.put<Product>(`/products/${id}`, body);
  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  await httpClient.delete(`/products/${id}`);
}
