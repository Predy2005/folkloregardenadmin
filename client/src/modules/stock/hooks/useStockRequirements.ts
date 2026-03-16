import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { AggregatedStockRequirements, EventStockRequirements } from "@shared/types";

export function useStockRequirements(dateFrom: string, dateTo: string) {
  return useQuery<AggregatedStockRequirements>({
    queryKey: ["/api/stock-requirements", dateFrom, dateTo],
    queryFn: () =>
      api.get(`/api/stock-requirements?dateFrom=${dateFrom}&dateTo=${dateTo}`),
    enabled: !!dateFrom && !!dateTo,
  });
}

export function useEventStockRequirements(eventId: number) {
  return useQuery<EventStockRequirements>({
    queryKey: ["/api/stock-requirements/events", eventId],
    queryFn: () => api.get(`/api/stock-requirements/events/${eventId}`),
    enabled: !!eventId,
    staleTime: 10000,
  });
}
