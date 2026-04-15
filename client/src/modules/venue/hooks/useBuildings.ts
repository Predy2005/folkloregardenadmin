import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateVenueQueries } from "@/shared/lib/query-helpers";
import { errorToast } from "@/shared/lib/toast-helpers";
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
  return useMutation({
    mutationFn: (data: Partial<Building>) => api.post("/api/venue/buildings", data),
    onSuccess: () => invalidateVenueQueries(),
    onError: (error: Error) => errorToast(error),
  });
}

export function useUpdateBuilding() {
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Building> & { id: number }) =>
      api.put(`/api/venue/buildings/${id}`, data),
    onSuccess: () => invalidateVenueQueries(),
    onError: (error: Error) => errorToast(error),
  });
}

export function useDeleteBuilding() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/venue/buildings/${id}`),
    onSuccess: () => invalidateVenueQueries(),
    onError: (error: Error) => errorToast(error),
  });
}

export function useCreateRoom() {
  return useMutation({
    mutationFn: ({ buildingId, ...data }: Partial<Room> & { buildingId: number }) =>
      api.post(`/api/venue/buildings/${buildingId}/rooms`, data),
    onSuccess: () => invalidateVenueQueries(),
    onError: (error: Error) => errorToast(error),
  });
}

export function useUpdateRoom() {
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Room> & { id: number }) =>
      api.put(`/api/venue/rooms/${id}`, data),
    onSuccess: () => invalidateVenueQueries(),
    onError: (error: Error) => errorToast(error),
  });
}

export function useDeleteRoom() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/venue/rooms/${id}`),
    onSuccess: () => invalidateVenueQueries(),
    onError: (error: Error) => errorToast(error),
  });
}
