import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTransports } from "@/hooks/queries/useTransports";
import { TransportCard } from "@/components/TransportCard";
import { EmptyState } from "@/components/EmptyState";
import { NotificationBell } from "@/components/NotificationBell";

export function DriverTransportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"upcoming" | "all">("upcoming");

  const {
    data: transports = [],
    isPending,
    isRefetching,
    error,
    refetch,
  } = useTransports();

  function handleRefresh() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void refetch();
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcoming = transports.filter(
    (t) => new Date(t.eventDate) >= todayStart,
  );

  const displayed = viewMode === "upcoming" ? upcoming : transports;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerGreeting, { color: colors.mutedForeground }]}>
              Dopravce
            </Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Plánované přepravy
            </Text>
          </View>
          <NotificationBell />
        </View>

        <View style={styles.toggleRow}>
          {(
            [
              ["upcoming", "Nadcházející"],
              ["all", "Všechny"],
            ] as const
          ).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor:
                    viewMode === val ? colors.primary : colors.secondary,
                  borderColor:
                    viewMode === val ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setViewMode(val)}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: viewMode === val ? "#fff" : colors.foreground },
                ]}
              >
                {label}
                {val === "upcoming" && upcoming.length > 0
                  ? ` (${upcoming.length})`
                  : ""}
                {val === "all" && transports.length > 0 && viewMode === "all"
                  ? ` (${transports.length})`
                  : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.info} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {error instanceof Error ? error.message : "Chyba načítání"}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.info }]}
            onPress={() => void refetch()}
          >
            <Text style={[styles.retryText, { color: colors.info }]}>
              Zkusit znovu
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.info}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="truck"
              title={
                viewMode === "upcoming"
                  ? "Žádné nadcházející přepravy"
                  : "Žádné přepravy"
              }
              subtitle={
                viewMode === "upcoming"
                  ? "V nejbližší době nejsou naplánovány žádné přepravy"
                  : "Zatím nebyly zaznamenány žádné přepravy"
              }
            />
          }
          renderItem={({ item }) => (
            <TransportCard
              transport={item}
              onPress={() =>
                router.push(`/event-detail?id=${item.id}&type=transport`)
              }
              onMapPress={() => {
                const addr = item.pickupLocation ?? item.dropoffLocation;
                if (addr) {
                  router.push(
                    `/transport-map?address=${encodeURIComponent(addr)}&clientName=${encodeURIComponent(item.eventName)}`,
                  );
                }
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerGreeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  toggleRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
});
