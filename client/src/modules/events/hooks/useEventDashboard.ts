import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import type { ManagerDashboardData } from "@shared/types";

export function useEventDashboard(eventId: number) {
  return useQuery<ManagerDashboardData>({
    queryKey: ["/api/events", eventId, "manager-dashboard"],
    queryFn: () => api.get(`/api/events/${eventId}/manager-dashboard`),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true,
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

export function usePayStaffAssignment(eventId: number) {
  return useMutation({
    mutationFn: (data: {
      assignmentId: number;
      hoursWorked?: number;
      paymentAmount?: number;
      paymentMethod?: string;
      notes?: string;
    }) =>
      api.post(`/api/events/${eventId}/staff-assignments/${data.assignmentId}/pay`, {
        hoursWorked: data.hoursWorked,
        paymentAmount: data.paymentAmount,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
    },
  });
}

export function useAddExpense(eventId: number) {
  return useMutation({
    mutationFn: (data: {
      category: string;
      amount: number;
      description?: string;
      paidTo?: string;
      paymentMethod?: string;
    }) => api.post(`/api/events/${eventId}/expenses`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
    },
  });
}

export function useAddIncome(eventId: number) {
  return useMutation({
    mutationFn: (data: {
      category: string;
      amount: number;
      description?: string;
      source?: string;
      paymentMethod?: string;
    }) => api.post(`/api/events/${eventId}/income`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
    },
  });
}
