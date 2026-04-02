import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { FloorPlanTemplate } from "@shared/types";

export function useTemplates() {
  return useQuery<FloorPlanTemplate[]>({
    queryKey: ["floor-plan-templates"],
    queryFn: () => api.get("/api/venue/templates"),
  });
}

export function useTemplate(id: number | null) {
  return useQuery<FloorPlanTemplate>({
    queryKey: ["floor-plan-templates", id],
    queryFn: () => api.get(`/api/venue/templates/${id}`),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FloorPlanTemplate>) => api.post("/api/venue/templates", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["floor-plan-templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<FloorPlanTemplate> & { id: number }) =>
      api.put(`/api/venue/templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["floor-plan-templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/venue/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["floor-plan-templates"] }),
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/api/venue/templates/${id}/duplicate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["floor-plan-templates"] }),
  });
}
