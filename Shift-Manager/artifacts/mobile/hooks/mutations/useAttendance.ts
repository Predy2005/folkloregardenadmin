import {
  onlineManager,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { MOBILE_PATHS } from "@/constants/api";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { enqueue } from "@/lib/writeQueue";

import { eventKeys } from "../queries/queryKeys";

interface Output {
  queued: boolean;
}

type AttendanceAction = "checkin" | "checkout";

function labelFor(action: AttendanceAction, eventId: number): string {
  return action === "checkin"
    ? `Check-in na akci #${eventId}`
    : `Check-out z akce #${eventId}`;
}

async function sendOrQueue(
  action: AttendanceAction,
  eventId: number,
): Promise<Output> {
  const path = action === "checkin" ? MOBILE_PATHS.checkIn : MOBILE_PATHS.checkOut;
  const body = { eventId };
  const invalidateKeys = [
    [...eventKeys.lists()],
    [...eventKeys.detail(eventId)],
  ];

  if (!onlineManager.isOnline()) {
    await enqueue({
      path,
      method: "POST",
      body,
      label: labelFor(action, eventId),
      invalidateKeys,
    });
    return { queued: true };
  }

  try {
    await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
    return { queued: false };
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
      throw e;
    }
    await enqueue({
      path,
      method: "POST",
      body,
      label: labelFor(action, eventId),
      invalidateKeys,
    });
    return { queued: true };
  }
}

/**
 * Attendance check-in — staff potvrzuje, že přišel na akci.
 * Online přímo `POST /api/mobile/me/attendance/checkin`; offline / 5xx do fronty.
 */
export function useCheckInMutation() {
  const qc = useQueryClient();
  return useMutation<Output, Error, number>({
    mutationFn: (eventId) => sendOrQueue("checkin", eventId),
    onSuccess: (_res, eventId) => {
      void qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      void qc.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

/**
 * Attendance check-out — staff potvrzuje konec akce.
 * Online přímo `POST /api/mobile/me/attendance/checkout`; offline / 5xx do fronty.
 */
export function useCheckOutMutation() {
  const qc = useQueryClient();
  return useMutation<Output, Error, number>({
    mutationFn: (eventId) => sendOrQueue("checkout", eventId),
    onSuccess: (_res, eventId) => {
      void qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      void qc.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}
