import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";

interface CrudOptions {
  /** Base API endpoint, e.g. "/api/vouchers" */
  endpoint: string;
  /** Query keys to invalidate on success */
  queryKey: string[];
  /** Entity name for toast messages (Czech), e.g. "Voucher" */
  entityName: string;
  /** Extra query keys to invalidate (for cross-entity dependencies) */
  extraInvalidateKeys?: string[][];
  /** Callback after successful create */
  onCreateSuccess?: () => void;
  /** Callback after successful update */
  onUpdateSuccess?: () => void;
  /** Callback after successful delete */
  onDeleteSuccess?: () => void;
}

/**
 * Generic CRUD mutation hook for standard create/update/delete patterns.
 * Replaces 35+ duplicate mutation definitions across CRUD pages.
 *
 * @example
 * const { createMutation, updateMutation, deleteMutation } = useCrudMutations<VoucherForm>({
 *   endpoint: "/api/vouchers",
 *   queryKey: ["/api/vouchers"],
 *   entityName: "Voucher",
 *   onCreateSuccess: () => { dialog.close(); form.reset(); },
 * });
 */
export function useCrudMutations<TForm>(options: CrudOptions) {
  const {
    endpoint,
    queryKey,
    entityName,
    extraInvalidateKeys,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
  } = options;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    extraInvalidateKeys?.forEach((key) =>
      queryClient.invalidateQueries({ queryKey: key })
    );
  };

  const createMutation = useMutation({
    mutationFn: (data: TForm) => api.post(endpoint, data),
    onSuccess: () => {
      invalidate();
      successToast(`${entityName} byl(a) vytvořen(a)`);
      onCreateSuccess?.();
    },
    onError: (error: Error) => errorToast(error),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TForm }) =>
      api.put(`${endpoint}/${id}`, data),
    onSuccess: () => {
      invalidate();
      successToast(`${entityName} byl(a) aktualizován(a)`);
      onUpdateSuccess?.();
    },
    onError: (error: Error) => errorToast(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      invalidate();
      successToast(`${entityName} byl(a) smazán(a)`);
      onDeleteSuccess?.();
    },
    onError: (error: Error) => errorToast(error),
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    /** Whether any mutation is currently pending */
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
}
