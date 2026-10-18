import { getToken } from "./auth";

export interface SupplierSummary {
  id: string;
  name: string;
  phone?: string;
  gstin?: string;
  totalInvoices: number;
  totalSpend: number;
  createdAt: string;
}

export async function fetchSuppliers(): Promise<SupplierSummary[]> {
  const jwt = getToken();
  const headers: HeadersInit = {};
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch("/api/suppliers", {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export async function createSupplier(payload: { name: string; phone?: string; gstin?: string }): Promise<SupplierSummary> {
  const jwt = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch("/api/suppliers", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to create supplier (${res.status})`);
  }

  return res.json();
}
