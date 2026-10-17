export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  shopId: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SignupPayload {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export interface SigninPayload {
  email: string;
  password: string;
}

const TOKEN_KEY = "invoicebee_token";
const USER_KEY = "invoicebee_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return data as T;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const authData = await handleResponse<AuthResponse>(response);
  setToken(authData.token);
  setStoredUser(authData.user);
  return authData;
}

export async function signin(payload: SigninPayload): Promise<AuthResponse> {
  const response = await fetch("/api/auth/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const authData = await handleResponse<AuthResponse>(response);
  setToken(authData.token);
  setStoredUser(authData.user);
  return authData;
}

export async function fetchCurrentUser(): Promise<User> {
  const token = getToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch("/api/auth/me", {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  const user = await handleResponse<User>(response);
  setStoredUser(user);
  return user;
}

export function logout(): void {
  removeToken();
  removeStoredUser();
}
