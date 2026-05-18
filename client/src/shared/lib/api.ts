import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Vytvoření axios instance.
//
// Phase B §1.2: `withCredentials: true` zajistí, že browser automaticky pošle
// httpOnly cookie `auth_token` (nastavena BE při loginu, viz Phase A v
// `JWTAuthenticationCookieListener`). FE už JWT v `localStorage` neukládá ani
// nepřidává `Authorization: Bearer` header — token je čistě httpOnly cookie,
// XSS k němu nepřistoupí. BE Lexik konfigurace má `cookie` extractor aktivní
// vedle `authorization_header` (Phase C zachována zapnutá kvůli mobile app
// kompat — viz `docs/refactor-todo.md` §1.2).
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor pro handling chyb. Při 401 smaže cached user payload
// (uložený jen pro UI hydration mezi reloady, ne pro auth) a redirectuje na login.
// Legacy `auth_token` v localStorage smažeme taky — defensive cleanup po Phase A→B
// migraci, ať lidé s prošlým localStorage tokenem nemají confused state.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("auth_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

 
// Helper funkce pro API requesty
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((res) => res.data),

  post: <T = any, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),

  put: <T = any, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),

  patch: <T = any, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};
 
