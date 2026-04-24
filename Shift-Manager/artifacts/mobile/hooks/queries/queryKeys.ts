/**
 * Query key factories — jediné místo, kde se stringy pro React Query klíče
 * definují. Invalidace přes `eventKeys.lists()` / `transportKeys.detail(id)`
 * místo překlepnutelných string literálů.
 *
 * Viz `doc/frontend-rules.md` §5.2.
 */

export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: () => [...eventKeys.lists()] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (id: number | string) => [...eventKeys.details(), String(id)] as const,
} as const;

export const transportKeys = {
  all: ["transports"] as const,
  lists: () => [...transportKeys.all, "list"] as const,
  list: () => [...transportKeys.lists()] as const,
  details: () => [...transportKeys.all, "detail"] as const,
  detail: (id: number | string) =>
    [...transportKeys.details(), String(id)] as const,
} as const;
