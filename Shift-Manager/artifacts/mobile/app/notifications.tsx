import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  useNotifications,
  type AppNotification,
} from "@/stores/notificationStore";
import { EmptyState } from "@/components/EmptyState";

function getNotifIcon(type: AppNotification["type"]): keyof typeof Feather.glyphMap {
  switch (type) {
    case "event_cancel": return "x-circle";
    case "event_add": return "plus-circle";
    case "event_change": return "edit-2";
    case "transport_cancel": return "x-circle";
    case "transport_change": return "edit-2";
    default: return "bell";
  }
}

function getNotifColor(type: AppNotification["type"], colors: ReturnType<typeof useColors>) {
  switch (type) {
    case "event_cancel":
    case "transport_cancel":
      return colors.destructive;
    case "event_add":
      return colors.success;
    default:
      return colors.warning;
  }
}

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Právě teď";
  if (mins < 60) return `Před ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Před ${hours} h`;
  return d.toLocaleDateString("cs-CZ");
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  function handlePress(notif: AppNotification) {
    markAsRead(notif.id);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header,
        {
          borderBottomColor: colors.border,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
        },
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Oznámení</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={[styles.readAll, { color: colors.primary }]}>Vše přečteno</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="bell-off"
            title="Žádná oznámení"
            subtitle="Zde uvidíte změny v akcích a přepravách"
          />
        }
        renderItem={({ item }) => {
          const iconColor = getNotifColor(item.type, colors);
          return (
            <TouchableOpacity
              style={[
                styles.notifItem,
                {
                  backgroundColor: item.read ? colors.card : colors.secondary,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.notifIcon, { backgroundColor: iconColor + "18" }]}>
                <Feather name={getNotifIcon(item.type)} size={18} color={iconColor} />
              </View>
              <View style={styles.notifContent}>
                <View style={styles.notifHeader}>
                  <Text style={[styles.notifTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.read && (
                    <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <Text style={[styles.notifBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  readAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  notifItem: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: {
    flex: 1,
    gap: 4,
  },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notifTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
