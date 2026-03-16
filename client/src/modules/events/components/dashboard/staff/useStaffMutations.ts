import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";

export function useStaffMutations(eventId: number) {
  const addStaffMutation = useMutation({
    mutationFn: async ({ staffMemberId, staffRoleId }: { staffMemberId: number; staffRoleId: number | null }) => {
      return api.post(`/api/events/${eventId}/staff-assignments`, {
        staffMemberId,
        staffRoleId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      successToast("Personál přidán");
    },
    onError: (error: Error) => errorToast(error),
  });

  const removeStaffMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      return api.delete(`/api/events/${eventId}/staff-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      successToast("Personál odebrán");
    },
    onError: (error: Error) => errorToast(error),
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: number; status: string }) => {
      return api.put(`/api/events/${eventId}/staff-assignments/${assignmentId}/attendance`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      successToast("Přítomnost aktualizována");
    },
    onError: (error: Error) => errorToast(error),
  });

  return {
    addStaffMutation,
    removeStaffMutation,
    updateAttendanceMutation,
  };
}
