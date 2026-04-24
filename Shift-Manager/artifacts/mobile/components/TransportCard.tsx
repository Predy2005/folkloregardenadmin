import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

/**
 * Položka seznamu transportů pro řidiče. Mapuje odpověď backendu
 * `GET /api/mobile/me/transports` → `{ transports: TransportListItem[] }`
 * (viz `App\Service\MobileDataService::serializeTransportForDriver()`).
 */
export interface TransportListItem {
  id: number;
  eventId: number;
  eventName: string;
  eventDate: string; // YYYY-MM-DD
  eventStartTime: string; // HH:mm
  venue: string | null;
  transportType: "ARRIVAL" | "DEPARTURE" | "BOTH" | "SHUTTLE" | null;
  scheduledTime: string | null; // HH:mm
  pickupLocation: string | null;
  dropoffLocation: string | null;
  passengerCount: number | null;
  executionStatus: "IN_PROGRESS" | "DONE" | null;
  notes: string | null;
  vehicle: {
    id: number;
    licensePlate: string;
    brand: string | null;
    model: string | null;
    capacity: number;
  } | null;
}

interface TransportCardProps {
  transport: TransportListItem;
  onPress?: () => void;
  onMapPress?: () => void;
}

function getStatusColor(
  status: TransportListItem["executionStatus"],
  colors: ReturnType<typeof useColors>,
) {
  switch (status) {
    case "IN_PROGRESS":
      return colors.info;
    case "DONE":
      return colors.success;
    default:
      return colors.warning;
  }
}

function getStatusLabel(status: TransportListItem["executionStatus"]) {
  switch (status) {
    case "IN_PROGRESS":
      return "Probíhá";
    case "DONE":
      return "Hotovo";
    default:
      return "Naplánováno";
  }
}

function getTransportTypeLabel(type: TransportListItem["transportType"]) {
  switch (type) {
    case "ARRIVAL":
      return "Příjezd";
    case "DEPARTURE":
      return "Odjezd";
    case "BOTH":
      return "Příjezd i odjezd";
    case "SHUTTLE":
      return "Kyvadlová";
    default:
      return null;
  }
}

export function TransportCard({
  transport,
  onPress,
  onMapPress,
}: TransportCardProps) {
  const colors = useColors();
  const statusColor = getStatusColor(transport.executionStatus, colors);
  const date = new Date(transport.eventDate);
  const dayName = date.toLocaleDateString("cs-CZ", { weekday: "short" });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString("cs-CZ", { month: "short" });
  const timeStr = transport.scheduledTime ?? transport.eventStartTime;
  const locationLabel =
    transport.pickupLocation ?? transport.dropoffLocation ?? "Adresa nezadána";
  const typeLabel = getTransportTypeLabel(transport.transportType);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.dateBox, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.dayName, { color: colors.primary }]}>{dayName}</Text>
        <Text style={[styles.dayNum, { color: colors.foreground }]}>{dayNum}</Text>
        <Text style={[styles.month, { color: colors.mutedForeground }]}>{month}</Text>
        <Text style={[styles.time, { color: colors.primary }]}>{timeStr}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {transport.eventName}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(transport.executionStatus)}
            </Text>
          </View>
        </View>

        <View style={styles.addressRow}>
          <Feather name="map-pin" size={13} color={colors.destructive} />
          <Text
            style={[styles.address, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {locationLabel}
          </Text>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {transport.passengerCount ?? "?"} os.
            </Text>
          </View>
          {typeLabel && (
            <View style={styles.metaItem}>
              <Feather name="git-merge" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {typeLabel}
              </Text>
            </View>
          )}
          {transport.vehicle && (
            <View style={styles.metaItem}>
              <Feather name="truck" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {transport.vehicle.licensePlate}
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.mapButton, { backgroundColor: colors.primary + "15" }]}
        onPress={onMapPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="map" size={18} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateBox: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 8,
    gap: 1,
  },
  dayName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayNum: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 26,
  },
  month: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },
  address: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

/** @deprecated Přechodový typ. Nově: `TransportListItem`. */
export type Transport = TransportListItem;
