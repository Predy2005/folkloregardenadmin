import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { Building, Room } from "@shared/types";

export function useBuildings() {
  return useQuery<Building[]>({
    queryKey: ["buildings"],
    queryFn: () => api.get("/api/venue/buildings"),
  });
}

export function useRooms() {
  return useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: () => api.get("/api/venue/rooms"),
  });
}

export function useCreateBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Building>) => api.post("/api/venue/buildings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buildings"] }),
  });
}

export function useUpdateBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Building> & { id: number }) =>
      api.put(`/api/venue/buildings/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buildings"] }),
  });
}

export function useDeleteBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/venue/buildings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buildings"] }),
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ buildingId, ...data }: Partial<Room> & { buildingId: number }) =>
      api.post(`/api/venue/buildings/${buildingId}/rooms`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buildings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Room> & { id: number }) =>
      api.put(`/api/venue/rooms/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buildings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/venue/rooms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buildings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}
