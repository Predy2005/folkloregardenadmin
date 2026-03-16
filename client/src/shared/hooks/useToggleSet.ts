import { useState, useCallback } from "react";

/**
 * Reusable hook for expand/collapse toggle state management.
 * Replaces 4+ duplicate toggleCategory/toggleSection patterns.
 *
 * @example
 * const { isOpen, toggle, toggleAll, openAll, closeAll } = useToggleSet<string>();
 * <button onClick={() => toggle("section1")}>Toggle</button>
 */
export function useToggleSet<T = string>(initialOpen?: Iterable<T>) {
  const [openItems, setOpenItems] = useState<Set<T>>(
    () => new Set(initialOpen)
  );

  const isOpen = useCallback((item: T) => openItems.has(item), [openItems]);

  const toggle = useCallback((item: T) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }, []);

  const open = useCallback((item: T) => {
    setOpenItems((prev) => new Set(prev).add(item));
  }, []);

  const close = useCallback((item: T) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      next.delete(item);
      return next;
    });
  }, []);

  const openAll = useCallback((items: Iterable<T>) => {
    setOpenItems(new Set(items));
  }, []);

  const closeAll = useCallback(() => {
    setOpenItems(new Set());
  }, []);

  return { isOpen, toggle, open, close, openAll, closeAll, openItems };
}
