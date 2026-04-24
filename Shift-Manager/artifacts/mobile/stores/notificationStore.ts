import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type:
    | "event_change"
    | "event_cancel"
    | "event_add"
    | "transport_change"
    | "transport_cancel";
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (
    n: Omit<AppNotification, "id" | "timestamp" | "read">,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const MAX_NOTIFICATIONS = 50;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],

      addNotification(n) {
        const newNotif: AppNotification = {
          ...n,
          id:
            Date.now().toString() +
            Math.random().toString(36).slice(2, 8),
          timestamp: new Date().toISOString(),
          read: false,
        };
        set((state) => ({
          notifications: [newNotif, ...state.notifications].slice(
            0,
            MAX_NOTIFICATIONS,
          ),
        }));
      },

      markAsRead(id) {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        }));
      },

      markAllAsRead() {
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            read: true,
          })),
        }));
      },

      clearAll() {
        set({ notifications: [] });
      },
    }),
    {
      // Zachovává původní AsyncStorage klíč z NotificationContext.tsx,
      // aby se nezahodily notifikace z předchozích buildů.
      name: "@folklore_notifications",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ notifications: state.notifications }),
    },
  ),
);

/**
 * Drop-in replacement za původní `useNotifications()` z
 * `@/context/NotificationContext`. `unreadCount` je derived.
 */
export function useNotifications() {
  return useNotificationStore(
    useShallow((s) => ({
      notifications: s.notifications,
      unreadCount: s.notifications.filter((n) => !n.read).length,
      addNotification: s.addNotification,
      markAsRead: s.markAsRead,
      markAllAsRead: s.markAllAsRead,
      clearAll: s.clearAll,
    })),
  );
}
