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

export type InvoiceJobStatus =
  | "STARTED"
  | "UPLOADED"
  | "PROCESSING"
  | "EXTRACTED"
  | "POLISHED"
  | "COMPLETED"
  | "SAVED"
  | "FAILED"
  | "CANCELLED";

export interface InvoiceJobResponse {
  jobId: string;
  status: InvoiceJobStatus;
  result?: InvoiceScanResponse | null;
  originalFileName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  jobId?: string;
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
  updateExisting?: boolean;
  items: SavePurchaseInvoiceItemPayload[];
}

export interface DuplicateInvoiceConflictDetails {
  conflict: boolean;
  duplicateInvoice: boolean;
  message: string;
  existingInvoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  totalAmount: number;
}

export class DuplicateInvoiceError extends Error {
  conflictDetails: DuplicateInvoiceConflictDetails;

  constructor(details: DuplicateInvoiceConflictDetails) {
    super(details.message || "Duplicate invoice found");
    this.name = "DuplicateInvoiceError";
    this.conflictDetails = details;
  }
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
  sourceFileUrl?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 409 && data && data.duplicateInvoice) {
      throw new DuplicateInvoiceError(data as DuplicateInvoiceConflictDetails);
    }
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return data as T;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startInvoiceScan(file?: File | null): Promise<InvoiceJobResponse> {
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

  return handleResponse<InvoiceJobResponse>(response);
}

export async function getInvoiceJobStatus(jobId: string): Promise<InvoiceJobResponse> {
  const token = getToken();
  if (!token) {
    throw new Error("You must be logged in to check invoice status.");
  }

  const response = await fetch(`/api/invoices/jobs/status/${jobId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<InvoiceJobResponse>(response);
}

export async function getActiveInvoiceJobs(): Promise<InvoiceJobResponse[]> {
  const token = getToken();
  if (!token) {
    return [];
  }

  const response = await fetch("/api/invoices/jobs/active", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<InvoiceJobResponse[]>(response);
}

export async function cancelInvoiceJob(jobId: string): Promise<InvoiceJobResponse> {
  const token = getToken();
  if (!token) {
    throw new Error("You must be logged in to cancel an invoice job.");
  }

  const response = await fetch(`/api/invoices/jobs/${jobId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<InvoiceJobResponse>(response);
}

export async function cancelAllActiveInvoiceJobs(): Promise<InvoiceJobResponse[]> {
  const token = getToken();
  if (!token) {
    throw new Error("You must be logged in to cancel invoice jobs.");
  }

  const response = await fetch("/api/invoices/jobs/cancel-active", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<InvoiceJobResponse[]>(response);
}

export async function pollInvoiceJobUntilComplete(
  jobId: string,
  onStatusChange?: (status: InvoiceJobStatus) => void
): Promise<InvoiceScanResponse> {
  const pollIntervalMs = 2000;
  const timeoutMs = 1200000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const job = await getInvoiceJobStatus(jobId);
    onStatusChange?.(job.status);

    if (job.status === "COMPLETED") {
      if (job.result) {
        return job.result;
      }
      throw new Error("Invoice scan completed but no result was returned.");
    }

    if (job.status === "CANCELLED") {
      throw new Error("Invoice processing was cancelled.");
    }

    if (job.status === "FAILED") {
      throw new Error("Invoice processing failed. Please check the image and try again.");
    }

    await sleep(pollIntervalMs);
  }

  throw new Error("Invoice scan timed out. Please try again.");
}

export async function scanInvoiceFile(
  file?: File | null,
  onStatusChange?: (status: InvoiceJobStatus) => void,
  onJobCreated?: (job: InvoiceJobResponse) => void
): Promise<InvoiceScanResponse> {
  const initial = await startInvoiceScan(file);
  onJobCreated?.(initial);
  onStatusChange?.(initial.status);

  if (initial.status === "COMPLETED" && initial.result) {
    return initial.result;
  }

  return pollInvoiceJobUntilComplete(initial.jobId, onStatusChange);
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

export interface PurchaseInvoiceItemDto {
  id: string;
  productId?: string;
  productName: string;
  sku?: string;
  description: string;
  quantity: number;
  unitCost: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotal: number;
}

export interface PurchaseInvoiceDetailDto {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  supplierGstin?: string;
  supplierPhone?: string;
  paymentMode?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  sourceFileUrl?: string;
  createdAt: string;
  postedAt?: string;
  items: PurchaseInvoiceItemDto[];
}

export async function fetchPurchaseInvoiceById(id: string): Promise<PurchaseInvoiceDetailDto> {
  const token = getToken();
  if (!token) {
    throw new Error("You must be logged in to fetch invoice details.");
  }

  const response = await fetch(`/api/invoices/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<PurchaseInvoiceDetailDto>(response);
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

export async function fetchInvoiceFileBlob(invoiceId: string): Promise<{ blob: Blob; contentType: string }> {
  const token = getToken();
  if (!token) {
    throw new Error("You must be logged in to access invoice files.");
  }

  const response = await fetch(`/api/invoices/${invoiceId}/file`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load bill image (status: ${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const blob = await response.blob();
  return { blob, contentType };
}
