// apiRequest — absolute base URL, token-based auth (used by clientApi.ts)
const getBaseUrl = () =>
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://shelter-connect.onrender.com";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
};

export const apiRequest = async <TResponse>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> => {
  const { method = "GET", token, body } = options;

  const headers: Record<string, string> = {
    Accept: "application/json"
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(data?.error || `Request failed with ${response.status}`);
  }

  return (await response.json()) as TResponse;
};

// request — uses same base URL as apiRequest so localhost + Vercel both hit Render
type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
};

async function request<TResponse>(
  path: string,
  options: RequestOptions = {}
): Promise<TResponse> {
  const { method = "GET", headers, body } = options;

  const response = await fetch(`${getBaseUrl()}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {})
    },
    body: body != null ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  return (await response.json()) as TResponse;
}

export { request };
