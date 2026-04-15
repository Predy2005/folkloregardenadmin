import type { InvoiceItem } from "@shared/types";

export interface InvoicePreview {
  invoiceType: string;
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  totalPrice?: number;
  percent?: number;
  defaultDescription?: string;
  paidDeposits?: number;
  currency?: string;
}

export interface InvoiceFormData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  taxableDate: string;
  status: string;
  // Customer
  customerName: string;
  customerCompany: string;
  customerStreet: string;
  customerCity: string;
  customerZipcode: string;
  customerIco: string;
  customerDic: string;
  customerEmail: string;
  customerPhone: string;
  // Items & totals
  items: InvoiceItem[];
  vatRate: number;
  currency: string;
  variableSymbol: string;
  note: string;
}
