/**
 * Centralized mutations for Event Dashboard
 * All mutations that affect dashboard data should be defined here
 */

import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { formatCurrency } from "@/shared/lib/formatting";
import { eventQueryKeys } from "./queryKeys";

/**
 * Invalidate all dashboard-related queries for an event
 */
function invalidateDashboard(eventId: number) {
  queryClient.invalidateQueries({ queryKey: eventQueryKeys.dashboard(eventId) });
}

/**
 * Invalidate dashboard + staff queries
 */
function invalidateStaff(eventId: number) {
  invalidateDashboard(eventId);
  queryClient.invalidateQueries({ queryKey: eventQueryKeys.staffAssignments(eventId) });
}

/**
 * Invalidate dashboard + guest queries
 */
function invalidateGuests(eventId: number) {
  invalidateDashboard(eventId);
  queryClient.invalidateQueries({ queryKey: eventQueryKeys.guestsByReservation(eventId) });
  queryClient.invalidateQueries({ queryKey: eventQueryKeys.presenceGrouping(eventId) });
}

// ============================================================================
// STAFF MUTATIONS
// ============================================================================

export function useAddStaffAssignment(eventId: number) {
  return useMutation({
    mutationFn: async ({ staffMemberId, staffRoleId }: { staffMemberId: number; staffRoleId: number | null }) => {
      return api.post(`/api/events/${eventId}/staff-assignments`, {
        staffMemberId,
        staffRoleId,
      });
    },
    onSuccess: () => {
      invalidateStaff(eventId);
      successToast("Personál přidán");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useRemoveStaffAssignment(eventId: number) {
  return useMutation({
    mutationFn: async (assignmentId: number) => {
      return api.delete(`/api/events/${eventId}/staff-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      invalidateStaff(eventId);
      successToast("Personál odebrán");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useUpdateStaffAttendance(eventId: number) {
  return useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: number; status: string }) => {
      return api.put(`/api/events/${eventId}/staff-assignments/${assignmentId}/attendance`, { status });
    },
    onSuccess: () => {
      invalidateStaff(eventId);
      successToast("Přítomnost aktualizována");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function usePayStaffAssignment(eventId: number) {
  return useMutation({
    mutationFn: async ({ assignmentId, amount, hoursWorked, paymentMethod }: {
      assignmentId: number;
      amount: number;
      hoursWorked?: number;
      paymentMethod?: string;
    }) => {
      return api.post(`/api/events/${eventId}/staff-assignments/${assignmentId}/pay`, {
        paymentAmount: amount,
        hoursWorked,
        paymentMethod: paymentMethod ?? "CASH",
      });
    },
    onSuccess: () => {
      invalidateStaff(eventId);
      invalidateDashboard(eventId);
      successToast("Platba zaznamenána do kasy eventu");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function usePayAllStaff(eventId: number) {
  return useMutation({
    mutationFn: async () => {
      return api.post(`/api/events/${eventId}/pay-all-staff`);
    },
    onSuccess: (data: { paidCount: number; totalPaid: string }) => {
      invalidateStaff(eventId);
      invalidateDashboard(eventId);
      successToast(`Vyplaceno ${data.paidCount} osob, celkem ${formatCurrency(data.totalPaid)}`);
    },
    onError: (error: Error) => errorToast(error),
  });
}

// ============================================================================
// CASHBOX TRANSFER MUTATIONS
// ============================================================================

export function useConfirmTransfer(eventId: number) {
  return useMutation({
    mutationFn: async (transferId: number) => {
      return api.post(`/api/cashbox/transfers/${transferId}/confirm`);
    },
    onSuccess: () => {
      invalidateDashboard(eventId);
      successToast("Převod potvrzen, kasa eventu inicializována");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useRejectTransfer(eventId: number) {
  return useMutation({
    mutationFn: async ({ transferId, reason }: { transferId: number; reason?: string }) => {
      return api.post(`/api/cashbox/transfers/${transferId}/reject`, { reason });
    },
    onSuccess: () => {
      invalidateDashboard(eventId);
      successToast("Převod odmítnut, peníze vráceny do hlavní kasy");
    },
    onError: (error: Error) => errorToast(error),
  });
}

// ============================================================================
// CASHBOX MUTATIONS
// ============================================================================

export function useInitializeEventCashbox(eventId: number) {
  return useMutation({
    mutationFn: async (initialBalance: number) => {
      return api.post(`/api/cashbox/event/${eventId}`, { initialBalance });
    },
    onSuccess: () => {
      invalidateDashboard(eventId);
      successToast("Kasa eventu vytvořena");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useCloseEventCashbox(eventId: number) {
  return useMutation({
    mutationFn: async ({ actualCash, notes }: { actualCash: number; notes?: string }) => {
      return api.post(`/api/cashbox/event/${eventId}/close`, { actualCash, notes });
    },
    onSuccess: (data: { transferAmount: string }) => {
      invalidateDashboard(eventId);
      successToast(`Kasa uzavřena, převedeno ${formatCurrency(data.transferAmount)} do hlavní kasy`);
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useReopenEventCashbox(eventId: number) {
  return useMutation({
    mutationFn: async () => {
      return api.post(`/api/cashbox/event/${eventId}/reopen`);
    },
    onSuccess: () => {
      invalidateDashboard(eventId);
      successToast("Kasa znovu otevřena");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useLockEventCashbox(eventId: number) {
  return useMutation({
    mutationFn: async () => {
      return api.post(`/api/cashbox/event/${eventId}/lock`);
    },
    onSuccess: () => {
      invalidateDashboard(eventId);
      successToast("Kasa zamčena");
    },
    onError: (error: Error) => errorToast(error),
  });
}

// ============================================================================
// GUEST MUTATIONS
// ============================================================================

export interface MoveGuestsFilter {
  reservationId?: number;
  nationality?: string;
  menuId?: number;
  menuName?: string;
  fromSpace?: string;
  count?: number;
}

export function useMoveGuests(eventId: number) {
  return useMutation({
    mutationFn: async (params: {
      targetSpace: string;
      filter: MoveGuestsFilter;
    }) => {
      return api.post(`/api/events/${eventId}/move-guests`, params);
    },
    onSuccess: (data: { movedCount: number; targetSpace: string }) => {
      invalidateGuests(eventId);
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.guestSummary(eventId) });
      successToast(`${data.movedCount} hostů přesunuto do ${data.targetSpace}`);
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useMarkGuestsPresent(eventId: number) {
  return useMutation({
    mutationFn: async (params: {
      nationality?: string;
      reservationId?: number;
      space?: string;
      present: boolean;
    }) => {
      return api.post(`/api/events/${eventId}/guests/mark-present`, params);
    },
    onSuccess: (data: { updatedCount: number }) => {
      invalidateGuests(eventId);
      successToast(`${data.updatedCount} hostů aktualizováno`);
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useCheckInReservation(eventId: number) {
  return useMutation({
    mutationFn: async ({ reservationId, present }: { reservationId: number; present: boolean }) => {
      return api.post(`/api/events/${eventId}/check-in`, { reservationId, present });
    },
    onSuccess: (data: { updatedCount: number }, variables) => {
      invalidateGuests(eventId);
      successToast(`${variables.present ? "Check-in" : "Check-out"} dokončen - ${data.updatedCount} hostů`);
    },
    onError: (error: Error) => errorToast(error),
  });
}

// ============================================================================
// FINANCE MUTATIONS
// ============================================================================

export function useAddExpense(eventId: number) {
  return useMutation({
    mutationFn: async (data: {
      category: string;
      amount: number;
      description?: string;
      paidTo?: string;
      paymentMethod?: string;
    }) => {
      return api.post(`/api/events/${eventId}/expenses`, data);
    },
    onSuccess: () => {
      invalidateDashboard(eventId);
      successToast("Výdaj přidán");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useAddIncome(eventId: number) {
  return useMutation({
    mutationFn: async (data: {
      category: string;
      amount: number;
      description?: string;
      source?: string;
    }) => {
      return api.post(`/api/events/${eventId}/income`, data);
    },
    onSuccess: () => {
      invalidateDashboard(eventId);
      successToast("Příjem přidán");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useStornoMovement(eventId: number) {
  return useMutation({
    mutationFn: async ({ movementId, reason }: { movementId: number; reason: string }) => {
      return api.post(`/api/events/${eventId}/movements/${movementId}/storno`, { reason });
    },
    onSuccess: () => {
      invalidateDashboard(eventId);
      successToast("Storno provedeno");
    },
    onError: (error: Error) => errorToast(error),
  });
}

// ============================================================================
// QUICK ADD GUEST
// ============================================================================

export function useQuickAddGuest(eventId: number) {
  return useMutation({
    mutationFn: async (data: {
      contactName: string;
      contactEmail?: string;
      contactPhone?: string;
      nationality: string;
      guestCount: number;
      space?: string;
      menu?: string;
      note?: string;
    }) => {
      return api.post(`/api/events/${eventId}/quick-add-guest`, data);
    },
    onSuccess: (data: { reservationId: number; guestsCreated: number }) => {
      invalidateGuests(eventId);
      successToast(`Vytvořeno ${data.guestsCreated} hostů`);
    },
    onError: (error: Error) => errorToast(error),
  });
}

// ============================================================================
// STAFF REQUIREMENTS MUTATIONS
// ============================================================================

export interface StaffRequirementResult {
  id: number;
  category: string;
  label: string;
  required: number;
  roleId: number | null;
  isManualOverride: boolean;
}

export function useRecalculateStaffRequirements(eventId: number) {
  return useMutation({
    mutationFn: async (forceOverwrite?: boolean) => {
      return api.post(`/api/events/${eventId}/staff-requirements/recalculate`, {
        forceOverwrite: forceOverwrite ?? false,
      });
    },
    onSuccess: () => {
      invalidateStaff(eventId);
      successToast("Požadavky na personál přepočítány");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useUpdateStaffRequirement(eventId: number) {
  return useMutation({
    mutationFn: async ({ category, count }: { category: string; count: number }) => {
      return api.put(`/api/events/${eventId}/staff-requirements/${encodeURIComponent(category)}`, {
        count,
      });
    },
    onSuccess: () => {
      invalidateStaff(eventId);
      successToast("Požadavek na personál aktualizován");
    },
    onError: (error: Error) => errorToast(error),
  });
}

export function useResetStaffRequirement(eventId: number) {
  return useMutation({
    mutationFn: async (category: string) => {
      return api.post(`/api/events/${eventId}/staff-requirements/${encodeURIComponent(category)}/reset`);
    },
    onSuccess: () => {
      invalidateStaff(eventId);
      successToast("Požadavek resetován na automaticky vypočítanou hodnotu");
    },
    onError: (error: Error) => errorToast(error),
  });
}
