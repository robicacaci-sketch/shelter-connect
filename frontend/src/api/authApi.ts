import { request } from "./httpClient";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
};

type MeResponse = {
  id: string;
  email: string;
  name: string;
};

// Demo OAuth flow: obtains a JWT for the demo case manager profile
export async function loginWithDemoProfile(): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: {
      provider: "demo",
      providerId: "demo-user-1",
      email: "demo.user@example.com",
      name: "Demo User"
    }
  });
}

// Email + password login
export async function loginWithEmail(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password }
  });
}

// Create a new account with email + password
export async function registerWithEmail(name: string, email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/register", {
    method: "POST",
    body: { name, email, password }
  });
}

export async function getCurrentUser(token: string): Promise<MeResponse> {
  return request<MeResponse>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
