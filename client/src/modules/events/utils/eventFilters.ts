import type { Event } from "@shared/types";
import dayjs from "dayjs";

export function filterAndSortEvents(
  events: Event[],
  search: string,
  statusFilter: string,
  typeFilter: string,
  timeFilter: "all" | "upcoming" | "past" | "nearest",
): Event[] {
  const now = dayjs();

  let filtered = events.filter((event) => {
    const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    const matchesType = typeFilter === "all" || event.eventType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
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
