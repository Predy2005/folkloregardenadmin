import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { eventQueryKeys } from "./queryKeys";
import type { EventGuestSummary } from "@shared/types";

/**
 * Hook for fetching unified guest summary - SINGLE SOURCE OF TRUTH
 */
export function useGuestSummary(eventId: number) {
  return useQuery<EventGuestSummary>({
    queryKey: eventQueryKeys.guestSummary(eventId),
    queryFn: () => api.get(`/api/events/${eventId}/guest-summary`),
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

/**
 * Invalidate guest summary (call after any guest mutation)
 */
export function invalidateGuestSummary(eventId: number) {
  queryClient.invalidateQueries({ queryKey: eventQueryKeys.guestSummary(eventId) });
  queryClient.invalidateQueries({ queryKey: eventQueryKeys.dashboard(eventId) });
}

export function useUpdateReservationPresence(eventId: number) {
  return useMutation({
    mutationFn: async ({ reservationId, presentCount }: { reservationId: number; presentCount: number }) => {
      return api.put(`/api/events/${eventId}/guests/reservation/${reservationId}/presence`, {
        presentCount,
      });
    },
    onSuccess: () => {
      invalidateGuestSummary(eventId);
      successToast("Přítomnost aktualizována");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useMoveGuestsToSpace(eventId: number) {
  return useMutation({
    mutationFn: async (params: {
      targetSpace: string;
      nationality?: string;
      reservationId?: number;
      sourceSpace?: string;
      count?: number;
    }) => {
      return api.post(`/api/events/${eventId}/guests/move-to-space`, params);
    },
    onSuccess: (data: { movedCount: number; targetSpace: string }) => {
      invalidateGuestSummary(eventId);
      successToast(`${data.movedCount} hostů přesunuto do ${data.targetSpace}`);
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useMarkGroupPresent(eventId: number) {
  return useMutation({
    mutationFn: async (params: {
      nationality?: string;
      reservationId?: number;
      space?: string;
      present: boolean;
    }) => {
      return api.post(`/api/events/${eventId}/guests/mark-present-by-group`, params);
    },
    onSuccess: (data: { updatedCount: number }) => {
      invalidateGuestSummary(eventId);
      successToast(`${data.updatedCount} hostů aktualizováno`);
    },
    onError: (error: Error) => errorToast(error),
  });
}
