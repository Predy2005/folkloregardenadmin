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
import { useEvents } from "@/hooks/queries/useEvents";
import { EventCard, type EventListItem } from "@/components/EventCard";
import { EmptyState } from "@/components/EmptyState";
import { NotificationBell } from "@/components/NotificationBell";

const FILTER_OPTIONS = [
  { label: "Vše", value: "all" },
  { label: "Potvrzené", value: "CONFIRMED" },
  { label: "Plánované", value: "PLANNED" },
  { label: "Probíhající", value: "IN_PROGRESS" },
  { label: "Zrušené", value: "CANCELLED" },
];

export function StaffEventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState("all");

  const {
    data: events = [],
    isPending,
    isRefetching,
    error,
    refetch,
  } = useEvents();

  function handleRefresh() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void refetch();
  }

  const filtered =
    filter === "all"
      ? events
      : events.filter((e) => e.status?.toUpperCase() === filter);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingFiltered = filtered.filter((e) => new Date(e.date) >= todayStart);
  const pastFiltered = filtered.filter((e) => new Date(e.date) < todayStart);

  const sections: Array<
    { title?: string; item: EventListItem } | { title: string; item?: undefined }
  > = [];
  if (upcomingFiltered.length > 0) {
    sections.push({ title: "Nadcházející" });
    upcomingFiltered.forEach((e) => sections.push({ item: e }));
  }
  if (pastFiltered.length > 0) {
    sections.push({ title: "Minulé" });
    pastFiltered.forEach((e) => sections.push({ item: e }));
  }

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
              Moje akce
            </Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Přehled událostí
            </Text>
          </View>
          <NotificationBell />
        </View>

        <FlatList
          horizontal
          data={FILTER_OPTIONS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    filter === item.value ? colors.primary : colors.secondary,
                  borderColor:
                    filter === item.value ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color:
                      filter === item.value
                        ? colors.primaryForeground
                        : colors.foreground,
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {error instanceof Error ? error.message : "Chyba načítání"}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.primary }]}
            onPress={() => void refetch()}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>
              Zkusit znovu
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item, index) =>
            item.title ?? item.item?.eventId?.toString() ?? index.toString()
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar"
              title="Žádné akce"
              subtitle="Momentálně nemáte přiřazené žádné akce"
            />
          }
          renderItem={({ item }) => {
            if (item.title && !item.item) {
              return (
                <Text
                  style={[styles.sectionHeader, { color: colors.mutedForeground }]}
                >
                  {item.title}
                </Text>
              );
            }
            if (!item.item) return null;
            return (
              <EventCard
                event={item.item}
                onPress={() =>
                  router.push(`/event-detail?id=${item.item!.eventId}&type=event`)
                }
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
  filterList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
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
  sectionHeader: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingBottom: 8,
    paddingTop: 4,
  },
});
