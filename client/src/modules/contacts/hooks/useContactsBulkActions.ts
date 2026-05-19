import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateContactQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";

export type BulkActionType = "delete" | "source" | null;

interface BulkCreatePartnersResponse {
  created: number;
  skipped: number;
  skippedItems: Array<{ contactId: number; reason: string }>;
}

interface UseContactsBulkActionsArgs {
  selectedIds: Set<number>;
  clearSelection: () => void;
}

/**
 * Bulk mutace nad kontakty: delete, update (změna zdroje) a vytvoření partnerů.
 * Drží i state pro dialog jednoduché bulk akce (delete/source) — dialog
 * vytváření partnerů řídí parent kvůli vlastní kategorii.
 */
export function useContactsBulkActions({ selectedIds, clearSelection }: UseContactsBulkActionsArgs) {
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>(null);
  const [bulkValue, setBulkValue] = useState("");

  const openBulkAction = (type: NonNullable<BulkActionType>) => {
    setBulkActionType(type);
    setBulkValue("");
    setBulkActionOpen(true);
  };

  const closeBulkAction = () => {
    setBulkActionOpen(false);
    setBulkActionType(null);
    setBulkValue("");
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => api.delete("/api/contacts/bulk-delete", { data: { ids } }),
    onSuccess: () => {
      successToast(`Smazáno ${selectedIds.size} kontaktů`);
      clearSelection();
      closeBulkAction();
      invalidateContactQueries();
    },
    onError: (error: Error) => errorToast(error),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: number[]; updates: Record<string, string> }) =>
      api.put("/api/contacts/bulk-update", { ids, updates }),
    onSuccess: () => {
      successToast(`Aktualizováno ${selectedIds.size} kontaktů`);
      clearSelection();
      closeBulkAction();
      invalidateContactQueries();
    },
    onError: (error: Error) => errorToast(error),
  });

  // BE endpoint POST /api/contacts/bulk-create-partners — skipuje kontakty
  // s existujícím IČ / Pohoda kódem v partner tabulce a kontakty bez jména.
  const bulkCreatePartnersMutation = useMutation({
    mutationFn: async ({ ids, partnerType }: { ids: number[]; partnerType: string }) =>
      api.post<BulkCreatePartnersResponse>("/api/contacts/bulk-create-partners", { ids, partnerType }),
    onSuccess: (data) => {
      let msg = `Vytvořeno ${data.created} partnerů`;
      if (data.skipped > 0) {
        const reasons = data.skippedItems
          .slice(0, 3)
          .map((s) => `#${s.contactId}: ${s.reason}`)
          .join("; ");
        msg += `, přeskočeno ${data.skipped} (${reasons}${data.skipped > 3 ? "…" : ""})`;
      }
      successToast(msg);
      clearSelection();
      invalidateContactQueries();
    },
    onError: (error: Error) => errorToast(error),
  });

  const executeBulkAction = () => {
    const ids = Array.from(selectedIds);
    if (bulkActionType === "delete") bulkDeleteMutation.mutate(ids);
    else if (bulkActionType === "source") bulkUpdateMutation.mutate({ ids, updates: { clientComeFrom: bulkValue } });
  };

  return {
    bulkActionOpen,
    bulkActionType,
    bulkValue,
    setBulkValue,
    openBulkAction,
    closeBulkAction,
    executeBulkAction,
    bulkDeleteMutation,
    bulkUpdateMutation,
    bulkCreatePartnersMutation,
  };
}
