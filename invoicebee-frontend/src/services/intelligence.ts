import { getToken } from "./auth";

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface ProductWebIntelligence {
  query: string;
  suggestedName: string;
  brand?: string;
  category: string;
  estimatedMrp?: number;
  hsnCode?: string;
  description?: string;
  salesPitch?: string;
  sources: SearchResultItem[];
}

export async function searchProductWeb(query: string): Promise<SearchResultItem[]> {
  const jwt = getToken();
  const headers: HeadersInit = {};
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(`/api/product-intelligence/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export async function enrichProductWeb(query: string): Promise<ProductWebIntelligence> {
  const jwt = getToken();
  const headers: HeadersInit = {};
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(`/api/product-intelligence/enrich?q=${encodeURIComponent(query)}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Failed to fetch web intelligence (${res.status})`);
  }

  return res.json();
}

export async function askProductAi(product: string, query?: string): Promise<string> {
  const jwt = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch("/api/product-intelligence/ask", {
    method: "POST",
    headers,
    body: JSON.stringify({ product, query: query || "" }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "Failed to query AI assistant");
  }

  const data = await res.json();
  return data.answer || "No response received.";
}
