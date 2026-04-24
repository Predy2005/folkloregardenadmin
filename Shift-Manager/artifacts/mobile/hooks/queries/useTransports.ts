import { useQuery } from "@tanstack/react-query";

import { MOBILE_PATHS } from "@/constants/api";
import { apiFetch } from "@/lib/apiClient";
import type { TransportListItem } from "@/components/TransportCard";

import { transportKeys } from "./queryKeys";

/**
 * Detail transportu pro řidiče. Shape zrcadlí
 * `App\Service\MobileDataService::serializeTransportDetail()`.
 */
export interface TransportDetail {
  id: number;
  eventId: number;
  eventName: string;
  eventDate: string;
  eventStartTime: string;
  venue: string | null;
  transportType: string | null;
  scheduledTime: string | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  passengerCount: number | null;
  executionStatus: "IN_PROGRESS" | "DONE" | null;
  notes: string | null;
  organizerPerson?: string | null;
  organizerPhone?: string | null;
  vehicle: {
    id: number;
    licensePlate: string;
    brand: string | null;
    model: string | null;
    capacity: number;
  } | null;
}

interface TransportsResponse {
  transports: TransportListItem[];
}

/**
 * Seznam jízd přihlášeného řidiče. Backend filtruje podle
 * `user.transportDriverId`.
 */
export function useTransports() {
  return useQuery({
    queryKey: transportKeys.list(),
    queryFn: async () => {
      const data = await apiFetch<TransportsResponse>(MOBILE_PATHS.transports);
      return data.transports ?? [];
    },
  });
}

/**
 * Detail jízdy pro řidiče.
 *
 * @param id — `eventTransportId` z list response
 */
export function useTransport(id: number | string | undefined) {
  return useQuery({
    queryKey: transportKeys.detail(id ?? ""),
    queryFn: () =>
      apiFetch<TransportDetail>(MOBILE_PATHS.transportDetail(id as number)),
    enabled: id !== undefined && id !== "",
  });
}
