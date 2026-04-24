import { API_BASE_URL, MOBILE_PATHS } from "@/constants/api";
import {
  secureDelete,
  secureGet,
  secureSet,
} from "@/lib/secureStorage";

/**
 * HTTP klient nad `fetch` s podporou mobilního auth flow:
 *   - automaticky přidává `Authorization: Bearer <access>` z SecureStore
 *   - při 401 zavolá `/api/mobile/auth/refresh` a zopakuje request
 *   - refresh je singleton (jedna rotace per tick, ne N paralelních)
 *
 * Hard logout: pokud refresh selže (token prošel, byl revokován atd.),
 * vyčistí tokeny a vyhodí `AuthenticationError`. AuthContext tomu naslouchá
 * přes globální handler (`setSessionExpiredHandler`) a přesměruje na /login.
 */

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = "Session vypršela, přihlas se znovu.") {
    super(401, message);
    this.name = "AuthenticationError";
  }
}

type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  sessionExpiredHandler = handler;
}

// Deduplikace paralelních refresh pokusů
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = await secureGet("refreshToken");
  if (!refreshToken) return null;
  const deviceId = await secureGet("deviceId");

  try {
    const res = await fetch(`${API_BASE_URL}${MOBILE_PATHS.refresh}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken, deviceId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    await secureSet("accessToken", data.accessToken);
    await secureSet("refreshToken", data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function ensureFreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function buildHeaders(
  override?: HeadersInit,
  auth = true,
): Promise<Headers> {
  const headers = new Headers(override);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = await secureGet("accessToken");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: HeadersInit;
  /** Pokud `false`, request nepošle Authorization header. Default: true. */
  auth?: boolean;
}

/**
 * Univerzální fetch s auto-refresh a Bearer tokenem.
 *
 * @throws `ApiError` pro !response.ok (parse `error` pole z JSONu)
 * @throws `AuthenticationError` když refresh selže (401 + no way to recover)
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { auth = true, headers: overrideHeaders, ...rest } = options;

  const run = async (headers: Headers) =>
    fetch(`${API_BASE_URL}${path}`, { ...rest, headers });

  let headers = await buildHeaders(overrideHeaders, auth);
  let response = await run(headers);

  // 401 → zkus refresh + 1× retry
  if (response.status === 401 && auth) {
    const fresh = await ensureFreshAccessToken();
    if (fresh) {
      headers.set("Authorization", `Bearer ${fresh}`);
      response = await run(headers);
    } else {
      await Promise.all([
        secureDelete("accessToken"),
        secureDelete("refreshToken"),
      ]);
      if (sessionExpiredHandler) {
        sessionExpiredHandler();
      }
      throw new AuthenticationError();
    }
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (text === "") return undefined as T;
  return JSON.parse(text) as T;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.text();
    if (body === "") return `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(body) as { error?: string; message?: string };
      return parsed.error ?? parsed.message ?? `HTTP ${response.status}`;
    } catch {
      return `HTTP ${response.status}: ${body.slice(0, 200)}`;
    }
  } catch {
    return `HTTP ${response.status}`;
  }
}
