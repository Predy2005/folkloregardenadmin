import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { ManagerDashboardData } from "@shared/types";
import { eventQueryKeys } from "./queryKeys";

/**
 * Hook for fetching event dashboard data
 * Auto-refreshes every 30 seconds
 */
export function useEventDashboard(eventId: number) {
  return useQuery<ManagerDashboardData>({
    queryKey: eventQueryKeys.dashboard(eventId),
    queryFn: () => api.get(`/api/events/${eventId}/manager-dashboard`),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true,
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

// Re-export mutations from centralized file for backwards compatibility
export {
  usePayStaffAssignment,
  useAddExpense,
  useAddIncome,
  useAddStaffAssignment,
  useRemoveStaffAssignment,
  useUpdateStaffAttendance,
  useMoveGuests,
  useMarkGuestsPresent,
  useCheckInReservation,
  useQuickAddGuest,
  useConfirmTransfer,
  useRejectTransfer,
} from "./useDashboardMutations";

// Re-export query keys
export { eventQueryKeys } from "./queryKeys";
