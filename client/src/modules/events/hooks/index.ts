// Query keys
export { eventQueryKeys, getEventInvalidationKeys } from "./queryKeys";

// Dashboard hook
export { useEventDashboard } from "./useEventDashboard";

// Guest summary hook - SINGLE SOURCE OF TRUTH for guest data
export {
  useGuestSummary,
  invalidateGuestSummary,
  useUpdateReservationPresence,
  useMoveGuestsToSpace,
  useMarkGroupPresent,
} from "./useGuestSummary";

// All mutations
export {
  // Staff
  useAddStaffAssignment,
  useRemoveStaffAssignment,
  useUpdateStaffAttendance,
  usePayStaffAssignment,
  // Staff requirements
  useRecalculateStaffRequirements,
  useUpdateStaffRequirement,
  useResetStaffRequirement,
  // Guests (legacy - use useGuestSummary mutations instead)
  useMoveGuests,
  useMarkGuestsPresent,
  useCheckInReservation,
  useQuickAddGuest,
  // Finance
  useAddExpense,
  useAddIncome,
} from "./useDashboardMutations";
