import { httpClient } from './httpClient';

export type DashboardStats = {
  productsCount: number;
  salesCount: number;
  dueCustomersCount: number;
  paymentsCount: number;
  totalSales: number;
  totalDue: number;
  customersCount: number;
};

type LaravelPaginator = {
  total: number;
};

type DuesIndexResponse = {
  summary: {
    total_outstanding: number;
    customers_with_due: number;
  };
  customers: LaravelPaginator & { data: unknown[] };
};

type SalesReportResponse = {
  summary: {
    net_sales: number;
    invoice_count: number;
  };
};

function readTotal(payload: unknown): number {
  if (!payload || typeof payload !== 'object') {
    return 0;
  }
  const o = payload as Record<string, unknown>;
  if (typeof o.total === 'number') {
    return o.total;
  }
  const meta = o.meta;
  if (meta && typeof meta === 'object' && 'total' in meta) {
    const t = (meta as { total?: unknown }).total;
    if (typeof t === 'number') {
      return t;
    }
  }
  return 0;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [
    productsRes,
    salesRes,
    duesRes,
    paymentsRes,
    reportRes,
    customersRes,
  ] = await Promise.all([
    httpClient.get<LaravelPaginator>('/products', { params: { per_page: 1 } }),
    httpClient.get<LaravelPaginator>('/sales', { params: { per_page: 1 } }),
    httpClient.get<DuesIndexResponse>('/dues', { params: { per_page: 1 } }),
    httpClient.get<LaravelPaginator>('/dues/payments', {
      params: { per_page: 1 },
    }),
    httpClient.get<SalesReportResponse>('/reports/sales'),
    httpClient.get<LaravelPaginator>('/customers', { params: { per_page: 1 } }),
  ]);

  const dues = duesRes.data;
  const report = reportRes.data;

  return {
    productsCount: readTotal(productsRes.data),
    salesCount: readTotal(salesRes.data),
    dueCustomersCount: dues.summary.customers_with_due,
    paymentsCount: readTotal(paymentsRes.data),
    totalSales: report.summary?.net_sales ?? 0,
    totalDue: dues.summary.total_outstanding,
    customersCount: readTotal(customersRes.data),
  };
}
