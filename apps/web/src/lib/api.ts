const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4010/api/v1";

type ApiError = { message?: string | string[] };

export async function publicApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const text = await response.text();
  const result = (text ? JSON.parse(text) : null) as T & ApiError;
  if (!response.ok) throw new Error(Array.isArray(result?.message) ? result.message.join(". ") : result?.message ?? "The request could not be completed");
  return result;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = sessionStorage.getItem("accessToken");
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (response.status === 401 && retry) {
    const refreshed = await fetch(`${apiUrl}/auth/refresh`, { method: "POST", credentials: "include" });
    if (refreshed.ok) {
      const session = await refreshed.json() as { accessToken: string };
      sessionStorage.setItem("accessToken", session.accessToken);
      return apiFetch<T>(path, options, false);
    }
  }
  const text = await response.text();
  const result = (text ? JSON.parse(text) : null) as T & ApiError;
  if (!response.ok) throw new Error(Array.isArray(result?.message) ? result.message.join(". ") : result?.message ?? "The request could not be completed");
  return result;
}
