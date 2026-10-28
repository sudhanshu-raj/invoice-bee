import { getToken } from "./auth";

export interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unit?: string;
  brand?: string;
  model?: string;
  sellingPrice: number;
  discountPrice?: number;
  mrp?: number;
  buyingPrice?: number;
  lastPurchaseCost?: number;
  stock: number;
  qrToken?: string;
  hsnSac?: string;
  pitchHook?: string;
  updatedAt?: string;
  intelligenceStatus?: "IN_PROGRESS" | "COMPLETED" | "FAILED" | "NONE";
  intelligencePitch?: string;
  intelligenceDescription?: string;
  intelligenceSpecifications?: string;
  sourceUrl?: string;
  sourceUrls?: string;
}

export async function fetchProductByQr(token: string): Promise<ProductDetail> {
  const jwt = getToken();
  const headers: HeadersInit = {};
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(`/api/products/qr/${encodeURIComponent(token)}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`No product found matching code: "${token}"`);
    }
    const errText = await res.text();
    throw new Error(errText || `Failed to look up product (${res.status})`);
  }

  return res.json();
}

export async function fetchShopProducts(): Promise<ProductDetail[]> {
  const jwt = getToken();
  const headers: HeadersInit = {};
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch("/api/products", {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export async function createProduct(payload: Partial<ProductDetail>): Promise<ProductDetail> {
  const jwt = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch("/api/products", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to create product (${res.status})`);
  }

  return res.json();
}

export async function deleteProduct(id: string): Promise<void> {
  const jwt = getToken();
  const headers: HeadersInit = {};
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to delete product (${res.status})`);
  }
}

export async function deleteProductsBatch(productIds: string[]): Promise<{ deleted: number }> {
  const jwt = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch("/api/products/batch-delete", {
    method: "POST",
    headers,
    body: JSON.stringify({ productIds }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to batch delete products (${res.status})`);
  }

  return res.json();
}

