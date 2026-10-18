import { getToken } from "./auth";

export interface InvoiceLineItem {
  serialNo: number;
  itemName: string;
  hsnSac?: string;
  quantity: number;
  unit?: string;
  pricePerUnit: number;
  discountPercentage?: number;
  discountAmount?: number;
  gstAmount?: number;
  gstPercentage?: number;
  totalAmount: number;
  confidenceScore?: number;
}

export interface ExtractedInvoiceData {
  invoiceNumber?: string;
  invoiceDate?: string;
  sellerName?: string;
  sellerGstin?: string;
  buyerName?: string;
  buyerGstin?: string;
  paymentMode?: string;
  items: InvoiceLineItem[];
  totalTaxAmount?: number;
  subTotal?: number;
  totalAmount?: number;
  grandTotal?: number;
}

export interface ProductMatchDto {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  mrp?: number;
  lastPurchaseCost?: number;
  stock: number;
  qrToken?: string;
}

export interface InvoiceScanResponse {
  invoiceData: ExtractedInvoiceData;
  availableProducts: ProductMatchDto[];
  sourceFileUrl?: string;
}

export interface SavePurchaseInvoiceItemPayload {
  matchedProductId?: string | null;
  name: string;
  sku?: string;
  category?: string;
  unit?: string;
  quantity: number;
  unitCost: number;
  taxRate?: number;
  taxAmount?: number;
  discountPercentage?: number;
  discountAmount?: number;
  lineTotal?: number;
  matchConfidence?: number;
  sellingPrice: number;
  discountPrice?: number;
  mrp?: number;
  description?: string;
  hsnSac?: string;
}

export interface SavePurchaseInvoicePayload {
  invoiceNumber: string;
  invoiceDate: string;
  paymentMode: string;
  supplierName: string;
  supplierGstin?: string;
  supplierPhone?: string;
  buyerName?: string;
  buyerGstin?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  sourceFileUrl?: string;
  items: SavePurchaseInvoiceItemPayload[];
}

export interface PurchaseInvoiceDto {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  totalAmount: number;
  status: string;
  itemsCount: number;
  createdAt: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return data as T;
}

export async function scanInvoiceFile(file?: File | null): Promise<InvoiceScanResponse> {
  const token = getToken();
  if (!token) {
    throw new Error("You must be logged in to scan invoices.");
  }

  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  }

  const response = await fetch("/api/invoices/scan", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return handleResponse<InvoiceScanResponse>(response);
}

export async function savePurchaseInvoice(payload: SavePurchaseInvoicePayload): Promise<PurchaseInvoiceDto> {
  const token = getToken();
  if (!token) {
    throw new Error("You must be logged in to save invoices.");
  }

  const response = await fetch("/api/invoices/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<PurchaseInvoiceDto>(response);
}

export async function fetchPurchaseInvoices(): Promise<PurchaseInvoiceDto[]> {
  const token = getToken();
  if (!token) {
    throw new Error("You must be logged in to fetch invoices.");
  }

  const response = await fetch("/api/invoices", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<PurchaseInvoiceDto[]>(response);
}
