import type { Event } from "@shared/types";
import dayjs from "dayjs";

export interface EventFilterOptions {
  search: string;
  status: Set<string>;
  type: Set<string>;
  coordinator: Set<string>;
  highlightOnly: boolean;
  time: "all" | "upcoming" | "past" | "nearest";
}

const HIGHLIGHT_TAG = "highlight";

export function filterAndSortEvents(
  events: Event[],
  options: EventFilterOptions,
): Event[] {
  const { search, status, type, coordinator, highlightOnly, time: timeFilter } = options;
  const now = dayjs();
  const lowerSearch = search.toLowerCase();

  let filtered = events.filter((event) => {
    if (lowerSearch) {
      const haystack = [
        event.name,
        event.organizerPerson,
        event.coordinator?.name,
        ...(event.eventTags ?? []),
        ...(event.headWaiters ?? []),
        ...(event.band?.map((m) => m.name) ?? []),
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(lowerSearch)) return false;
    }
    if (status.size > 0 && !status.has(event.status)) return false;
    if (type.size > 0 && !type.has(event.eventType)) return false;
    if (coordinator.size > 0 && (!event.coordinator?.name || !coordinator.has(event.coordinator.name))) return false;
    if (highlightOnly) {
      const tags = (event.eventTags ?? []).map((t) => t.toLowerCase());
      if (!tags.includes(HIGHLIGHT_TAG)) return false;
    }
    return true;
  });

  if (timeFilter === "upcoming") {
    filtered = filtered.filter((event) => dayjs(event.eventDate).isAfter(now, 'day') || dayjs(event.eventDate).isSame(now, 'day'));
  } else if (timeFilter === "past") {
    filtered = filtered.filter((event) => dayjs(event.eventDate).isBefore(now, 'day'));
  } else if (timeFilter === "nearest") {
    const sortedByDistance = [...filtered].sort((a, b) => {
      const distA = Math.abs(dayjs(a.eventDate).diff(now, 'day'));
      const distB = Math.abs(dayjs(b.eventDate).diff(now, 'day'));
      return distA - distB;
    });

    const pastEvents = sortedByDistance.filter((event) => dayjs(event.eventDate).isBefore(now, 'day'));
    const futureEvents = sortedByDistance.filter((event) => dayjs(event.eventDate).isAfter(now, 'day') || dayjs(event.eventDate).isSame(now, 'day'));

    const nearestPast = pastEvents.slice(0, 4).sort((a, b) => dayjs(b.eventDate).diff(dayjs(a.eventDate)));
    const nearestFuture = futureEvents.slice(0, 4).sort((a, b) => dayjs(a.eventDate).diff(dayjs(b.eventDate)));

    filtered = [...nearestFuture, ...nearestPast];
  } else {
    filtered = filtered.sort((a, b) => dayjs(b.eventDate).diff(dayjs(a.eventDate)));
  }

  if (timeFilter !== "nearest") {
    filtered = filtered.sort((a, b) => {
      if (timeFilter === "upcoming") {
        return dayjs(a.eventDate).diff(dayjs(b.eventDate));
      } else if (timeFilter === "past") {
        return dayjs(b.eventDate).diff(dayjs(a.eventDate));
      } else {
        return dayjs(b.eventDate).diff(dayjs(a.eventDate));
      }
    });
  }

  return filtered;
}

export function getStatusBadgeVariant(status: Event['status']) {
  switch (status) {
    case 'DRAFT':
      return 'secondary';
    case 'PLANNED':
      return 'default';
    case 'IN_PROGRESS':
      return 'default';
    case 'COMPLETED':
      return 'default';
    case 'CANCELLED':
      return 'destructive';
  }
}

export function totalGuests(event: Event) {
  return event.guestsPaid + event.guestsFree;
}
