// One helper for every call to the HeavyHire API.
// It adds the login token, refreshes it when it expires, and turns
// API errors into an ApiError you can show to the user.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const BASE = `${API_URL}/api/v1`;
const TOKENS_KEY = "hh_tokens";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { fields?: { path: string; message: string }[] },
  ) {
    super(message);
  }
}

export interface ListResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number } & Record<string, number>;
}

// ---- token storage (in the browser) ----------------------------------------

export function getTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function setTokens(tokens: Tokens | null) {
  if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  else localStorage.removeItem(TOKENS_KEY);
  window.dispatchEvent(new Event("hh-auth-change"));
}

let refreshing: Promise<boolean> | null = null;

/** Gets a new access token. If several calls fail at once, only one refresh runs. */
async function refreshTokens(): Promise<boolean> {
  const tokens = getTokens();
  if (!tokens) return false;
  refreshing ??= fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  })
    .then(async (res) => {
      const json = await res.json();
      if (!json.success) {
        setTokens(null);
        return false;
      }
      setTokens(json.data);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// ---- requests ----------------------------------------------------------------

type Query = Record<string, string | number | boolean | undefined | null>;

interface Options {
  body?: unknown;
  query?: Query;
  raw?: boolean; // return { data, meta } instead of just data
}

async function request<T>(method: string, path: string, opts: Options = {}, retry = true): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const tokens = getTokens();

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
        ...(tokens ? { authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "No internet connection. Please try again.");
  }

  const json = await res.json().catch(() => null);
  if (res.status === 401 && retry && tokens && (await refreshTokens())) {
    return request<T>(method, path, opts, false);
  }
  if (!json?.success) {
    const e = json?.error ?? {};
    throw new ApiError(res.status, e.code ?? "UNKNOWN", e.message ?? "Something went wrong", e.details);
  }
  return (opts.raw ? { data: json.data, meta: json.meta } : json.data) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  list: <T>(path: string, query?: Query) => request<ListResponse<T>>("GET", path, { query, raw: true }),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, { body }),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

/** Turns an API validation error into { fieldName: message } for forms. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  return Object.fromEntries((err.details?.fields ?? []).map((f) => [f.path, f.message]));
}
