const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "Unknown error");
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export function apiStreamFetch(
  path: string,
  body: unknown,
  options?: RequestInit,
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...options?.headers,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    ...options,
  });
}

export function getWsUrl(path: string): string {
  const wsBase = API_BASE.replace(/^http/, "ws");
  return `${wsBase}${path}`;
}
