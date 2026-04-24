import { useQuery } from "@tanstack/react-query";

import { MOBILE_PATHS } from "@/constants/api";
import { apiFetch } from "@/lib/apiClient";
import type { EventListItem } from "@/components/EventCard";

import { eventKeys } from "./queryKeys";

/**
 * Detail eventu pro staff. Shape zrcadlí
 * `App\Service\MobileDataService::serializeEventDetail()`.
 */
export interface EventDetail {
  eventId: number;
  name: string;
  eventType: string;
  eventSubcategory?: string | null;
  date: string;
  startTime: string;
  durationMinutes: number;
  venue: string | null;
  language: string;
  guestsTotal: number;
  guestsPaid: number;
  guestsFree: number;
  status: string;
  notesStaff?: string | null;
  schedule?: Array<{
    id: number;
    time: string;
    durationMinutes: number;
    activity: string;
    description?: string | null;
    notes?: string | null;
  }>;
  tables?: Array<{
    id: number;
    name: string;
    room: string;
    capacity: number;
  }>;
  menu?: Array<{
    id: number;
    menuName: string;
    quantity: number;
    servingTime: string | null;
    notes: string | null;
  }>;
  beverages?: Array<{
    id: number;
    name: string;
    quantity: number;
    unit: string;
    notes: string | null;
  }>;
  myAssignmentId: number;
  myAttendanceStatus: "PENDING" | "PRESENT";
  myAttendedAt: string | null;
}

interface EventsResponse {
  events: EventListItem[];
}

/**
 * Seznam akcí přiřazených přihlášenému personálu.
 *
 * Backend už data pre-filtruje podle `user.staffMemberId`, klient nefiltruje
 * na úrovni permissions — jen podle UI toggle (status/upcoming/past).
 */
export function useEvents() {
  return useQuery({
    queryKey: eventKeys.list(),
    queryFn: async () => {
      const data = await apiFetch<EventsResponse>(MOBILE_PATHS.events);
      return data.events ?? [];
    },
  });
}

/**
 * Detail eventu pro staff. Vrací rolové sekce (waiter vidí stoly, cook menu).
 *
 * @param id — `eventId` z list response
 */
export function useEvent(id: number | string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(id ?? ""),
    queryFn: () => apiFetch<EventDetail>(MOBILE_PATHS.eventDetail(id as number)),
    enabled: id !== undefined && id !== "",
  });
}
