import { httpClient } from './httpClient';

export type Product = {
  id: number;
  product_id: string;
  name: string;
  image_path?: string | null;
  image_url?: string | null;
  selling_price: string | number;
  buying_price: string | number | null;
  available_quantity: string | number;
  quantity_unit: string | null;
  location: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProductImageFile = {
  uri: string;
  type: string;
  name: string;
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
  image?: ProductImageFile | null;
};

export type UpdateProductPayload = {
  product_id: string;
  name: string;
  selling_price: number;
  buying_price?: number | null;
  available_quantity: number;
  quantity_unit?: string | null;
  location?: string | null;
  image?: ProductImageFile | null;
};

function appendImage(form: FormData, image: ProductImageFile): void {
  form.append('image', {
    uri: image.uri,
    type: image.type,
    name: image.name,
  } as unknown as Blob);
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<Product> {
  if (payload.image) {
    const form = new FormData();
    const sku = payload.product_id?.trim();
    if (sku) {
      form.append('product_id', sku);
    }
    form.append('name', payload.name.trim());
    form.append('selling_price', String(payload.selling_price));
    form.append('available_quantity', String(payload.available_quantity));
    const bp = payload.buying_price;
    if (bp != null && !Number.isNaN(bp)) {
      form.append('buying_price', String(bp));
    }
    const qu = payload.quantity_unit?.trim();
    form.append('quantity_unit', qu !== '' && qu != null ? qu : '');
    const loc = payload.location?.trim();
    form.append('location', loc !== '' && loc != null ? loc : '');
    appendImage(form, payload.image);

    const { data } = await httpClient.post<Product>('/products', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

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

export async function fetchProduct(id: number): Promise<Product> {
  const { data } = await httpClient.get<Product>(`/products/${id}`);
  return data;
}

export async function updateProduct(
  id: number,
  payload: UpdateProductPayload,
): Promise<Product> {
  if (payload.image) {
    const form = new FormData();
    form.append('_method', 'PUT');
    form.append('product_id', payload.product_id.trim());
    form.append('name', payload.name.trim());
    form.append('selling_price', String(payload.selling_price));
    form.append('available_quantity', String(payload.available_quantity));
    const bp = payload.buying_price;
    if (bp != null && !Number.isNaN(bp)) {
      form.append('buying_price', String(bp));
    }
    const qu = payload.quantity_unit?.trim();
    form.append('quantity_unit', qu !== '' && qu != null ? qu : '');
    const loc = payload.location?.trim();
    form.append('location', loc !== '' && loc != null ? loc : '');
    appendImage(form, payload.image);

    const { data } = await httpClient.post<Product>(`/products/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

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
