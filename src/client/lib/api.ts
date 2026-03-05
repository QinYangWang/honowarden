const API_BASE = "";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { skipAuth, ...init } = options;
  const headers = new Headers(init.headers);

  if (!skipAuth) {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (response.status === 401 && !skipAuth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${localStorage.getItem("access_token")}`);
      const retry = await fetch(`${API_BASE}${path}`, { ...init, headers });
      if (!retry.ok) throw new ApiError(retry.status, await retry.text());
      if (retry.status === 204) return null as T;
      return retry.json();
    }
    window.location.href = "/#/login";
    throw new ApiError(401, "Unauthorized");
  }

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  if (response.status === 204 || response.headers.get("Content-Length") === "0") {
    return null as T;
  }

  return response.json();
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return false;

  try {
    const response = await fetch("/identity/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: "web",
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API Error ${status}: ${body}`);
  }
}
