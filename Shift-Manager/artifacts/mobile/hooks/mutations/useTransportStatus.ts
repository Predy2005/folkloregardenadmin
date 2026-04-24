import {
  onlineManager,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { MOBILE_PATHS } from "@/constants/api";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { enqueue } from "@/lib/writeQueue";

import { transportKeys } from "../queries/queryKeys";

export type TransportStatus = "IN_PROGRESS" | "DONE";

interface Input {
  id: number;
  status: TransportStatus;
}

interface Output {
  queued: boolean;
  status: TransportStatus;
}

function labelFor(status: TransportStatus): string {
  return status === "DONE" ? "Hotovo" : "Jedu";
}

async function sendOrQueue(input: Input): Promise<Output> {
  const body = { status: input.status };
  const path = MOBILE_PATHS.transportStatus(input.id);
  const invalidateKeys = [
    [...transportKeys.lists()],
    [...transportKeys.detail(input.id)],
  ];

  if (!onlineManager.isOnline()) {
    await enqueue({
      path,
      method: "PUT",
      body,
      label: `Jízda #${input.id} → ${labelFor(input.status)}`,
      invalidateKeys,
    });
    return { queued: true, status: input.status };
  }

  try {
    await apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
    return { queued: false, status: input.status };
  } catch (e) {
    // 4xx = server odmítl (validace, oprávnění, neexistuje). Nezaqueueovat —
    // retry by nic nepomohl. Vyhoď chybu, UI ji zobrazí.
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
      throw e;
    }
    // 5xx / síť / unknown = přechodně nedostupné. Do fronty.
    await enqueue({
      path,
      method: "PUT",
      body,
      label: `Jízda #${input.id} → ${labelFor(input.status)}`,
      invalidateKeys,
    });
    return { queued: true, status: input.status };
  }
}

/**
 * Update statusu jízdy (driver stiskne "Jedu" / "Hotovo").
 *
 * Online: přímé `PUT /api/mobile/me/transports/{id}/status`.
 * Offline / 5xx: uloží do write queue (`lib/writeQueue.ts`) a příště se flushne.
 * 4xx: vyhoď chybu (UI ji zobrazí) — retry by nic nepomohl.
 */
export function useTransportStatusMutation() {
  const qc = useQueryClient();
  return useMutation<Output, Error, Input>({
    mutationFn: sendOrQueue,
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: transportKeys.detail(vars.id) });
      void qc.invalidateQueries({ queryKey: transportKeys.lists() });
    },
  });
}
