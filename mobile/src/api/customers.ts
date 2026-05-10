import { httpClient } from './httpClient';

export type Customer = {
  id: number;
  name: string;
  phone: string;
  address?: string | null;
};

export type PaginatedCustomers = {
  data: Customer[];
  current_page: number;
  last_page: number;
  total: number;
};

export async function searchCustomers(params: {
  search: string;
  page?: number;
  perPage?: number;
}): Promise<PaginatedCustomers> {
  const { search, page = 1, perPage = 20 } = params;
  const { data } = await httpClient.get<PaginatedCustomers>('/customers', {
    params: {
      page,
      per_page: perPage,
      ...(search.trim() !== '' ? { search: search.trim() } : {}),
    },
  });
  return data;
}
