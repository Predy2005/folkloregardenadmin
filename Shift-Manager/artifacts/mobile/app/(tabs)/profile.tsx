import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/stores/authStore";
import { useNotifications } from "@/stores/notificationStore";
import { getUiRoleLabel } from "@/lib/mobileRoles";

export default function ProfileTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, role, logout } = useAuth();
  const { unreadCount, clearAll } = useNotifications();

  async function handleLogout() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace("/login");
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? 67 : 0,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
        },
      ]}
    >
      <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Feather name="user" size={28} color="#fff" />
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: colors.foreground }]}>
            {user?.username || user?.email}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + "18" }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>
              {getUiRoleLabel(role, user?.roles)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Nastavení</Text>

        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow
            icon="bell"
            label="Oznámení"
            value={`${unreadCount} nepřečtených`}
            onPress={() => router.push("/notifications")}
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="trash-2"
            label="Smazat všechna oznámení"
            onPress={() => {
              clearAll();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            danger
            colors={colors}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow
            icon="log-out"
            label="Odhlásit se"
            onPress={handleLogout}
            danger
            colors={colors}
          />
        </View>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>
        Folklore Garden Mobile v1.0
      </Text>
    </ScrollView>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  danger,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const color = danger ? colors.destructive : colors.foreground;
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.settingsLeft}>
        <Feather name={icon} size={18} color={color} />
        <Text style={[styles.settingsLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.settingsRight}>
        {value && (
          <Text style={[styles.settingsValue, { color: colors.mutedForeground }]}>{value}</Text>
        )}
        <Feather name="chevron-right" size={16} color={colors.border} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 20,
    paddingTop: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  username: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  email: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  settingsGroup: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  settingsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settingsValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingBottom: 10,
  },
});
