import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
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

import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/EmptyState";
import { useEventHistory } from "@/hooks/queries/useEvents";
import { useColors } from "@/hooks/useColors";

/**
 * Historie minulých akcí pro personál — primárně proto, aby viděli status
 * výplaty (PAID / PENDING) za odpracované akce. Backend vrací jen eventy
 * s `eventDate < today`, sestupně.
 */
export function StaffHistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    data: events = [],
    isPending,
    isRefetching,
    error,
    refetch,
  } = useEventHistory();

  function handleRefresh() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void refetch();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
        <Text
          style={[styles.headerGreeting, { color: colors.mutedForeground }]}
        >
          Historie
        </Text>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Odpracované akce
        </Text>
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
          data={events}
          keyExtractor={(item) => item.eventId.toString()}
          contentContainerStyle={[
            styles.listContent,
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
          ListEmptyComponent={
            <EmptyState
              icon="clock"
              title="Žádná historie"
              subtitle="Zatím nemáš odpracované akce."
            />
          }
          renderItem={({ item }) => (
            <EventCard
              event={item}
              showPayment
              onPress={() =>
                router.push(`/event-detail?id=${item.eventId}&type=event`)
              }
            />
          )}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
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
