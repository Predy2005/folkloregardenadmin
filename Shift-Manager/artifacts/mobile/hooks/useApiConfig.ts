import { API_BASE_URL } from "@/constants/api";
import { apiFetch as clientApiFetch } from "@/lib/apiClient";

/**
 * Zpětně kompatibilní hook. Nově deleguje veškeré volání na `lib/apiClient`,
 * který řeší auto-refresh Bearer tokenu a parsování JSON. Komponenty, které
 * kontextuálně potřebovaly jen `apiFetch(path)`, nemusí měnit API.
 *
 * Nový kód by měl importovat `apiFetch` přímo z `@/lib/apiClient`.
 */
export function useApiConfig() {
  return {
    apiFetch: clientApiFetch,
    baseUrl: API_BASE_URL,
  };
}
