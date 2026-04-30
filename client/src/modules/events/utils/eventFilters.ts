import type { Event } from "@shared/types";
import dayjs from "dayjs";

export interface EventFilterOptions {
  search: string;
  status: Set<string>;
  type: Set<string>;
  coordinator: Set<string>;
  spaces: Set<string>;
  highlightOnly: boolean;
  time: "all" | "upcoming" | "past" | "nearest";
  /** Datum od (YYYY-MM-DD) — pokud nastaveno, přebíjí time tab. */
  dateFrom: string | null;
  /** Datum do (YYYY-MM-DD) — pokud nastaveno, přebíjí time tab. */
  dateTo: string | null;
  /**
   * Quick toggles (yes/no/any). `null` = filtr není aktivní.
   * `true` = jen ty s, `false` = jen ty bez.
   */
  hasBand: boolean | null;
  hasCoordinator: boolean | null;
  hasHeadWaiter: boolean | null;
  hasFreeGuests: boolean | null;
  hasGuests: boolean | null;
  /** Min počet hostů (>= 0). `null` = bez omezení. */
  minGuests: number | null;
  /** Max počet hostů. `null` = bez omezení. */
  maxGuests: number | null;
}

const HIGHLIGHT_TAG = "highlight";

export function filterAndSortEvents(
  events: Event[],
  options: EventFilterOptions,
): Event[] {
  const {
    search, status, type, coordinator, spaces, highlightOnly,
    time: timeFilter, dateFrom, dateTo,
    hasBand, hasCoordinator, hasHeadWaiter, hasFreeGuests, hasGuests,
    minGuests, maxGuests,
  } = options;
  const now = dayjs();
  const lowerSearch = search.toLowerCase();

  // Když je date range aktivní, přebíjí time tab — pak je řazení vzestupné podle data.
  const dateRangeActive = !!(dateFrom || dateTo);

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
    if (spaces.size > 0) {
      const eventSpaces = (event.spaces ?? []).map((s) => s.spaceName);
      if (!eventSpaces.some((s) => spaces.has(s))) return false;
    }
    if (highlightOnly) {
      const tags = (event.eventTags ?? []).map((t) => t.toLowerCase());
      if (!tags.includes(HIGHLIGHT_TAG)) return false;
    }

    // Date range — má přednost před time tabem
    if (dateFrom && dayjs(event.eventDate).isBefore(dayjs(dateFrom), "day")) return false;
    if (dateTo && dayjs(event.eventDate).isAfter(dayjs(dateTo), "day")) return false;

    // Quick toggles — true = "má", false = "nemá", null = ignoruj
    if (hasBand !== null) {
      const has = (event.band?.length ?? 0) > 0;
      if (has !== hasBand) return false;
    }
    if (hasCoordinator !== null) {
      const has = !!event.coordinator?.name;
      if (has !== hasCoordinator) return false;
    }
    if (hasHeadWaiter !== null) {
      const has = (event.headWaiters?.length ?? 0) > 0;
      if (has !== hasHeadWaiter) return false;
    }
    if (hasFreeGuests !== null) {
      const has = (event.guestsFree ?? 0) > 0;
      if (has !== hasFreeGuests) return false;
    }
    if (hasGuests !== null) {
      const has = (event.guestsTotal ?? 0) > 0;
      if (has !== hasGuests) return false;
    }
    if (minGuests !== null && (event.guestsTotal ?? 0) < minGuests) return false;
    if (maxGuests !== null && (event.guestsTotal ?? 0) > maxGuests) return false;

    return true;
  });

  // Když je date range aktivní, deaktivuj time-tab logiku — řazení vzestupně podle data
  if (dateRangeActive) {
    return filtered.sort((a, b) => dayjs(a.eventDate).diff(dayjs(b.eventDate)));
  }

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
