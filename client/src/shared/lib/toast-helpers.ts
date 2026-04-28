/**
 * Toast notification helpers to reduce boilerplate across mutation handlers.
 * Replaces 50+ duplicate toast({ title: "Úspěch/Chyba", ... }) patterns.
 */
import { toast } from "@/shared/hooks/use-toast";

export function successToast(description: string) {
  toast({ title: "Úspěch", description });
}

/**
 * Extracts a user-facing message from a thrown error. For Axios rejections,
 * pulls `response.data.error` / `response.data.message` (what the backend
 * actually returns in JsonResponse) — `error.message` alone would only show
 * the generic "Request failed with status code XXX".
 */
function describeError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const err = error as {
      response?: { data?: { error?: string; message?: string } };
      message?: string;
    };
    const fromResponse = err.response?.data?.error ?? err.response?.data?.message;
    if (fromResponse) return fromResponse;
    if (err.message) return err.message;
  }
  return "Něco se nepovedlo";
}

export function errorToast(error: unknown) {
  toast({
    title: "Chyba",
    description: describeError(error),
    variant: "destructive",
  });
}
