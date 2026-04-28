import { useMutation, useQueryClient } from "@tanstack/react-query";

import { MOBILE_PATHS } from "@/constants/api";
import { apiFetch } from "@/lib/apiClient";

import { eventKeys } from "../queries/queryKeys";

export type EventResponseValue = "CONFIRMED" | "DECLINED";

export interface EventResponseInput {
  eventId: number;
  response: EventResponseValue;
  /** Povinné při response = DECLINED, jinak ignorováno backendem. */
  reason?: string;
}

/**
 * Personál potvrzuje účast / odhlašuje se z akce.
 * Volá `POST /api/mobile/me/events/{id}/respond`.
 *
 * Pozn.: NEjde do offline write-queue — vyžaduje synchronní validaci
 * (lock 4 h před akcí) a uživatel musí vidět chybu hned. Když je offline,
 * onError to ohlásí a user to zkusí znovu, až bude online.
 */
export function useEventResponseMutation() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, EventResponseInput>({
    mutationFn: ({ eventId, response, reason }) =>
      apiFetch(MOBILE_PATHS.eventRespond(eventId), {
        method: "POST",
        body: JSON.stringify({ response, reason }),
      }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: eventKeys.detail(vars.eventId) });
      void qc.invalidateQueries({ queryKey: eventKeys.lists() });
      void qc.invalidateQueries({ queryKey: eventKeys.history() });
    },
  });
}
