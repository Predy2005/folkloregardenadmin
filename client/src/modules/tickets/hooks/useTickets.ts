import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type {
  Ticket,
  TicketListItem,
  TicketCounts,
  TicketStatus,
  TicketPriority,
  TicketType,
} from "@shared/types";

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  type?: TicketType[];
  assignedToMe?: boolean;
  search?: string;
}

const queryKey = ["/api/tickets"] as const;

export function useTickets(filters: TicketFilters = {}) {
  return useQuery({
    queryKey: [...queryKey, filters],
    queryFn: () => {
      const params = new URLSearchParams();
      filters.status?.forEach((s) => params.append("status[]", s));
      filters.priority?.forEach((p) => params.append("priority[]", p));
      filters.type?.forEach((t) => params.append("type[]", t));
      if (filters.assignedToMe) params.set("assignedToMe", "1");
      if (filters.search) params.set("search", filters.search);
      const qs = params.toString();
      return api.get<TicketListItem[]>(`/api/tickets${qs ? "?" + qs : ""}`);
    },
    staleTime: 30_000,
  });
}

export function useTicket(id: number | null) {
  return useQuery({
    enabled: id !== null && id > 0,
    queryKey: [...queryKey, id],
    queryFn: () => api.get<Ticket>(`/api/tickets/${id}`),
  });
}

export function useTicketCounts() {
  return useQuery({
    queryKey: [...queryKey, "counts"],
    queryFn: () => api.get<TicketCounts>("/api/tickets/counts"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export const TICKETS_QUERY_KEY = queryKey;
