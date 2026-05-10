export type SaleSummaryLineParam = {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Products: undefined;
  AddProduct: undefined;
  EditProduct: { productId: number };
  CreateSale: undefined;
  SaleSummary: {
    invoiceId: number;
    invoiceNumber: string;
    customerName: string | null;
    customerPhone: string | null;
    lines: SaleSummaryLineParam[];
    subtotal: number;
    invoiceDiscount: number;
    grandTotal: number;
    paymentModeLabel: string;
    amountPaid: number | null;
    changeAmount: number | null;
    balanceDue: number | null;
    notes: string | null;
  };
};
