import { getToken } from "./auth";

export type EnquiryStatus = "PENDING" | "FOLLOWED_UP" | "CONVERTED" | "CANCELLED";

export interface CustomerEnquiry {
  id: string;
  shopId: string;
  customerName: string;
  phone: string;
  productsInterested?: string;
  expectedVisitDate?: string;
  status: EnquiryStatus;
  followUpCount: number;
  nextFollowUpDate?: string;
  lastFollowedUpAt?: string;
  followUpNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerEnquiryPayload {
  customerName: string;
  phone: string;
  productsInterested?: string;
  expectedVisitDate?: string;
  nextFollowUpDate?: string;
  notes?: string;
}

export interface UpdateCustomerEnquiryPayload {
  customerName?: string;
  phone?: string;
  productsInterested?: string;
  expectedVisitDate?: string;
  status?: EnquiryStatus;
  followUpCount?: number;
  nextFollowUpDate?: string;
  followUpNotes?: string;
  notes?: string;
}

export interface LogFollowUpPayload {
  nextFollowUpDate?: string;
  callNote?: string;
  status?: EnquiryStatus;
}

export interface FetchEnquiryOptions {
  status?: EnquiryStatus;
  timeBlock?: "due" | "upcoming" | "no_followup" | "shopped" | "all";
  search?: string;
}

export async function fetchCustomerEnquiries(options?: FetchEnquiryOptions): Promise<CustomerEnquiry[]> {
  const jwt = getToken();
  const headers: HeadersInit = {};
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const params = new URLSearchParams();
  if (options?.status) {
    params.append("status", options.status);
  }
  if (options?.timeBlock && options.timeBlock !== "all") {
    params.append("timeBlock", options.timeBlock);
  }
  if (options?.search) {
    params.append("search", options.search);
  }

  const qs = params.toString();
  const res = await fetch(`/api/customer-enquiries${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export async function createCustomerEnquiry(payload: CreateCustomerEnquiryPayload): Promise<CustomerEnquiry> {
  const jwt = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch("/api/customer-enquiries", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to create enquiry (${res.status})`);
  }

  return res.json();
}

export async function logCustomerFollowUp(id: string, payload: LogFollowUpPayload): Promise<CustomerEnquiry> {
  const jwt = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(`/api/customer-enquiries/${id}/log-follow-up`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to log follow-up (${res.status})`);
  }

  return res.json();
}

export async function updateCustomerEnquiry(id: string, payload: UpdateCustomerEnquiryPayload): Promise<CustomerEnquiry> {
  const jwt = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(`/api/customer-enquiries/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to update enquiry (${res.status})`);
  }

  return res.json();
}

export async function updateCustomerEnquiryStatus(id: string, status: EnquiryStatus): Promise<CustomerEnquiry> {
  const jwt = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(`/api/customer-enquiries/${id}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to update status (${res.status})`);
  }

  return res.json();
}

export async function deleteCustomerEnquiry(id: string): Promise<void> {
  const jwt = getToken();
  const headers: HeadersInit = {};
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(`/api/customer-enquiries/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to delete enquiry (${res.status})`);
  }
}
