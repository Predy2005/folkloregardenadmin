/**
 * Toast notification helpers to reduce boilerplate across mutation handlers.
 * Replaces 50+ duplicate toast({ title: "Úspěch/Chyba", ... }) patterns.
 */
import { toast } from "@/shared/hooks/use-toast";

export function successToast(description: string) {
  toast({ title: "Úspěch", description });
}

export function errorToast(error: Error | string) {
  toast({
    title: "Chyba",
    description: typeof error === "string" ? error : error.message,
    variant: "destructive",
  });
}
