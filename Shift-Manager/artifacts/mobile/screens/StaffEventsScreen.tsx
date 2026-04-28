import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { EventCard, type EventListItem } from "@/components/EventCard";
import {
  EventsCalendar,
  dateKey,
  type CalendarMode,
} from "@/components/EventsCalendar";
import { NotificationBell } from "@/components/NotificationBell";
import { useEvents } from "@/hooks/queries/useEvents";
import { useColors } from "@/hooks/useColors";

const FILTER_OPTIONS = [
  { label: "Vše", value: "all" },
  { label: "Potvrzené", value: "CONFIRMED" },
  { label: "Plánované", value: "PLANNED" },
  { label: "Probíhající", value: "IN_PROGRESS" },
  { label: "Zrušené", value: "CANCELLED" },
];

type ViewMode = "list" | "calendar";

export function StaffEventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

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

  const filtered = useMemo(
    () =>
      filter === "all"
        ? events
        : events.filter((e) => e.status?.toUpperCase() === filter),
    [events, filter],
  );

  // Hlavní tab ukazuje jen nadcházející akce — minulé jsou v samostatném
  // tabu „Historie" (s informací o výplatě).
  const upcomingFiltered = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return filtered.filter((e) => new Date(e.date) >= todayStart);
  }, [filtered]);

  const sections: Array<
    { title?: string; item: EventListItem } | { title: string; item?: undefined }
  > = upcomingFiltered.map((e) => ({ item: e }));

  // ─── Calendar data ───────────────────────────────────────────────────
  // Markované dny vidíme z VŠECH eventů (i minulých), aby uživatel mohl
  // pohodlně listovat zpátky a vidět co měl. Filtrace `filter` se použije
  // pro list pohled, kalendář pracuje s nezfiltrovanými daty.
  const markedDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const key = e.date; // už ve tvaru YYYY-MM-DD
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const eventsForSelectedDay = useMemo(() => {
    const key = dateKey(selectedDate);
    return events.filter((e) => e.date === key);
  }, [events, selectedDate]);

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

        <View style={styles.viewToggleRow}>
          <ViewToggleButton
            label="Seznam"
            icon="list"
            active={viewMode === "list"}
            onPress={() => setViewMode("list")}
            colors={colors}
          />
          <ViewToggleButton
            label="Kalendář"
            icon="calendar"
            active={viewMode === "calendar"}
            onPress={() => setViewMode("calendar")}
            colors={colors}
          />
        </View>

        {viewMode === "list" && (
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
        )}

        {viewMode === "calendar" && (
          <View style={styles.calendarModeRow}>
            <CalendarModeChip
              label="Měsíc"
              active={calendarMode === "month"}
              onPress={() => setCalendarMode("month")}
              colors={colors}
            />
            <CalendarModeChip
              label="Týden"
              active={calendarMode === "week"}
              onPress={() => setCalendarMode("week")}
              colors={colors}
            />
          </View>
        )}
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
      ) : viewMode === "list" ? (
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
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.calendarScroll,
            {
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <EventsCalendar
            mode={calendarMode}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            markedDates={markedDates}
          />

          <View style={styles.dayHeader}>
            <Text
              style={[styles.dayHeaderTitle, { color: colors.foreground }]}
            >
              {selectedDate.toLocaleDateString("cs-CZ", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
            <Text
              style={[styles.dayHeaderCount, { color: colors.mutedForeground }]}
            >
              {eventsForSelectedDay.length === 0
                ? "Žádné akce"
                : `${eventsForSelectedDay.length} ${
                    eventsForSelectedDay.length === 1
                      ? "akce"
                      : eventsForSelectedDay.length < 5
                        ? "akce"
                        : "akcí"
                  }`}
            </Text>
          </View>

          <View style={styles.dayEventsList}>
            {eventsForSelectedDay.map((e) => (
              <EventCard
                key={e.eventId}
                event={e}
                onPress={() =>
                  router.push(`/event-detail?id=${e.eventId}&type=event`)
                }
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function ViewToggleButton({
  label,
  icon,
  active,
  onPress,
  colors,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.viewToggleBtn,
        {
          backgroundColor: active ? colors.primary : colors.secondary,
        },
      ]}
      activeOpacity={0.8}
    >
      <Feather
        name={icon}
        size={14}
        color={active ? colors.primaryForeground : colors.foreground}
      />
      <Text
        style={[
          styles.viewToggleText,
          {
            color: active ? colors.primaryForeground : colors.foreground,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CalendarModeChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.calendarModeChip,
        {
          backgroundColor: active ? colors.primary + "18" : "transparent",
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.calendarModeText,
          { color: active ? colors.primary : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
  viewToggleRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  viewToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewToggleText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  calendarModeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  calendarModeChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  calendarModeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
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
  calendarScroll: {
    padding: 16,
    gap: 14,
  },
  dayHeader: {
    paddingTop: 8,
    paddingHorizontal: 4,
    gap: 2,
  },
  dayHeaderTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  dayHeaderCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  dayEventsList: {
    gap: 10,
  },
});
