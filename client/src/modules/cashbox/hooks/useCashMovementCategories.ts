import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { errorToast } from "@/shared/lib/toast-helpers";
import type { CashMovementCategory } from "@shared/types";

export function useCashMovementCategories(type?: "INCOME" | "EXPENSE") {
  return useQuery<CashMovementCategory[]>({
    queryKey: ["/api/cash-movement-categories", { type }],
    queryFn: () =>
      api.get(
        "/api/cash-movement-categories" + (type ? `?type=${type}` : ""),
      ),
    staleTime: 60_000,
  });
}

export function useCategoryAutocomplete(
  query: string,
  type?: "INCOME" | "EXPENSE",
) {
  return useQuery<CashMovementCategory[]>({
    queryKey: ["/api/cash-movement-categories/autocomplete", { q: query, type }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (type) params.set("type", type);
      return api.get(
        `/api/cash-movement-categories/autocomplete?${params.toString()}`,
      );
    },
    staleTime: 30_000,
  });
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      api.post<CashMovementCategory>("/api/cash-movement-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cash-movement-categories"],
      });
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useUpdateCategory() {
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      name?: string;
      type?: string;
    }) => api.put<CashMovementCategory>(`/api/cash-movement-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cash-movement-categories"],
      });
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`/api/cash-movement-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cash-movement-categories"],
      });
    },
    onError: (error: Error) => errorToast(error),
  });
}
