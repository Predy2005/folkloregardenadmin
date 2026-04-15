import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

export type DashboardLayout = "3col" | "2col" | "1col";

export interface BoxState {
  id: string;
  collapsed: boolean;
  fullWidth: boolean;
}

export interface DashboardLayoutState {
  layout: DashboardLayout;
  boxOrder: string[];
  boxStates: Record<string, BoxState>;
}

interface DashboardLayoutContextValue {
  // Layout
  layout: DashboardLayout;
  setLayout: (layout: DashboardLayout) => void;

  // Box order
  boxOrder: string[];
  setBoxOrder: (order: string[]) => void;
  moveBox: (fromIndex: number, toIndex: number) => void;
  reorderBox: (activeId: string, overId: string) => void;

  // Box states
  isCollapsed: (boxId: string) => boolean;
  toggleCollapsed: (boxId: string) => void;
  isFullWidth: (boxId: string) => boolean;
  toggleFullWidth: (boxId: string) => void;

  // Persistence
  resetToDefaults: () => void;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_BOX_ORDER = [
  "guests",        // Unified Guest Command Center
  "floor-plan",    // Read-only floor plan for table service
  "staff-planning",
  "transport",
  "vouchers",
  "expenses",
  "settlement",
];

// Boxes that default to full-width in multi-column layouts
const DEFAULT_FULL_WIDTH_BOXES = new Set(["floor-plan"]);

const DEFAULT_LAYOUT: DashboardLayout = "2col";

const STORAGE_KEY = "event-dashboard-layout";

// ============================================================================
// CONTEXT
// ============================================================================

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (!context) {
    throw new Error("useDashboardLayout must be used within DashboardLayoutProvider");
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface DashboardLayoutProviderProps {
  children: ReactNode;
  eventId: number;
}

export function DashboardLayoutProvider({ children, eventId }: DashboardLayoutProviderProps) {
  const storageKey = `${STORAGE_KEY}-${eventId}`;

  // Migrate old box IDs to new ones
  const migrateBoxOrder = (oldOrder: string[]): string[] => {
    // Map old IDs to new ones (guest-stats, check-in, spaces -> guests)
    const migrations: Record<string, string> = {
      "guest-stats": "guests",
      "check-in": "guests",
      "spaces": "guests",
    };

    const seen = new Set<string>();
    const migrated: string[] = [];
    let guestsInserted = false;

    for (const id of oldOrder) {
      const newId = migrations[id] || id;

      // Skip duplicates
      if (seen.has(newId)) {
        continue;
      }

      // For old guest-related IDs, insert "guests" at the first occurrence
      if (migrations[id] && !guestsInserted) {
        migrated.push("guests");
        seen.add("guests");
        guestsInserted = true;
      } else if (!migrations[id]) {
        // Keep non-migrated IDs
        migrated.push(newId);
        seen.add(newId);
      }
    }

    // Add any missing default boxes at the end
    for (const id of DEFAULT_BOX_ORDER) {
      if (!seen.has(id)) {
        migrated.push(id);
        seen.add(id);
      }
    }

    return migrated;
  };

  // Load initial state from localStorage
  const loadInitialState = (): DashboardLayoutState => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const migratedOrder = migrateBoxOrder(parsed.boxOrder || DEFAULT_BOX_ORDER);
        return {
          layout: parsed.layout || DEFAULT_LAYOUT,
          boxOrder: migratedOrder,
          boxStates: parsed.boxStates || {},
        };
      }
    } catch (e) {
      console.error("Failed to load dashboard layout:", e);
    }
    return {
      layout: DEFAULT_LAYOUT,
      boxOrder: DEFAULT_BOX_ORDER,
      boxStates: {},
    };
  };

  const [state, setState] = useState<DashboardLayoutState>(loadInitialState);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save dashboard layout:", e);
    }
  }, [state, storageKey]);

  // Layout
  const setLayout = useCallback((layout: DashboardLayout) => {
    setState((prev) => ({ ...prev, layout }));
  }, []);

  // Box order
  const setBoxOrder = useCallback((boxOrder: string[]) => {
    setState((prev) => ({ ...prev, boxOrder }));
  }, []);

  const moveBox = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newOrder = [...prev.boxOrder];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      return { ...prev, boxOrder: newOrder };
    });
  }, []);

  // Reorder using box IDs (more reliable for drag-and-drop)
  const reorderBox = useCallback((activeId: string, overId: string) => {
    setState((prev) => {
      const workingOrder = [...prev.boxOrder];

      // Add missing IDs if they're not in the order
      if (!workingOrder.includes(activeId)) {
        workingOrder.push(activeId);
      }
      if (!workingOrder.includes(overId)) {
        workingOrder.push(overId);
      }

      const activeIndex = workingOrder.indexOf(activeId);
      const overIndex = workingOrder.indexOf(overId);

      const newOrder = [...workingOrder];
      newOrder.splice(activeIndex, 1);
      newOrder.splice(overIndex, 0, activeId);

      return { ...prev, boxOrder: newOrder };
    });
  }, []);

  // Box states
  const getBoxState = useCallback(
    (boxId: string): BoxState => {
      return state.boxStates[boxId] || { id: boxId, collapsed: false, fullWidth: DEFAULT_FULL_WIDTH_BOXES.has(boxId) };
    },
    [state.boxStates]
  );

  const updateBoxState = useCallback((boxId: string, updates: Partial<BoxState>) => {
    setState((prev) => ({
      ...prev,
      boxStates: {
        ...prev.boxStates,
        [boxId]: { ...getBoxState(boxId), ...updates },
      },
    }));
  }, [getBoxState]);

  const isCollapsed = useCallback(
    (boxId: string) => getBoxState(boxId).collapsed,
    [getBoxState]
  );

  const toggleCollapsed = useCallback(
    (boxId: string) => {
      const current = getBoxState(boxId);
      updateBoxState(boxId, { collapsed: !current.collapsed });
    },
    [getBoxState, updateBoxState]
  );

  const isFullWidth = useCallback(
    (boxId: string) => getBoxState(boxId).fullWidth,
    [getBoxState]
  );

  const toggleFullWidth = useCallback(
    (boxId: string) => {
      const current = getBoxState(boxId);
      updateBoxState(boxId, { fullWidth: !current.fullWidth });
    },
    [getBoxState, updateBoxState]
  );

  // Reset
  const resetToDefaults = useCallback(() => {
    setState({
      layout: DEFAULT_LAYOUT,
      boxOrder: DEFAULT_BOX_ORDER,
      boxStates: {},
    });
  }, []);

  const value: DashboardLayoutContextValue = {
    layout: state.layout,
    setLayout,
    boxOrder: state.boxOrder,
    setBoxOrder,
    moveBox,
    reorderBox,
    isCollapsed,
    toggleCollapsed,
    isFullWidth,
    toggleFullWidth,
    resetToDefaults,
  };

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}
