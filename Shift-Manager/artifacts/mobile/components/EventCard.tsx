import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

/**
 * Položka seznamu eventů pro staff. Mapuje odpověď backendu
 * `GET /api/mobile/me/events` → `{ events: EventListItem[] }`
 * (viz `App\Service\MobileDataService::serializeEventListItem()`).
 */
export interface EventListItem {
  eventId: number;
  name: string;
  eventType: string;
  eventSubcategory?: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  venue: string | null;
  language: string;
  guestsTotal: number;
  status: string;
  myAssignmentId: number;
  myAssignmentStatus: "ASSIGNED" | "CONFIRMED" | "DECLINED";
  myConfirmedAt: string | null;
  myDeclineReason: string | null;
  myAttendanceStatus: "PENDING" | "PRESENT";
  myAttendedAt: string | null;
  myPaymentStatus: string;
  myPaymentAmount: string | null;
  myHoursWorked: string;
  responseLockedAt: string | null;
}

interface EventCardProps {
  event: EventListItem;
  onPress?: () => void;
  /** Když true, ukáže se navíc payment badge — používá Historie tab. */
  showPayment?: boolean;
}

interface AssignmentBadgeStyle {
  label: string;
  color: keyof ReturnType<typeof useColors>;
  icon: keyof typeof Feather.glyphMap;
}

function getAssignmentBadge(
  status: EventListItem["myAssignmentStatus"],
): AssignmentBadgeStyle {
  switch (status) {
    case "CONFIRMED":
      return { label: "Potvrzeno", color: "success", icon: "check-circle" };
    case "DECLINED":
      return { label: "Odhlášen", color: "warning", icon: "x-circle" };
    default:
      return {
        label: "Čeká na potvrzení",
        color: "info",
        icon: "clock",
      };
  }
}

function getPaymentBadge(
  status: string,
): { label: string; color: keyof ReturnType<typeof useColors> } | null {
  const s = status?.toUpperCase();
  if (s === "PAID") return { label: "Zaplaceno", color: "success" };
  if (s === "PENDING") return { label: "Čeká platba", color: "warning" };
  if (s === "CANCELLED") return { label: "Zrušená platba", color: "destructive" };
  return null;
}

function getStatusColor(status: string, colors: ReturnType<typeof useColors>) {
  switch (status?.toUpperCase()) {
    case "CONFIRMED":
      return colors.success;
    case "IN_PROGRESS":
      return colors.info;
    case "COMPLETED":
      return colors.accent;
    case "CANCELLED":
      return colors.destructive;
    case "DRAFT":
      return colors.warning;
    default:
      return colors.info;
  }
}

function getStatusLabel(status: string) {
  switch (status?.toUpperCase()) {
    case "PLANNED":
      return "Plánováno";
    case "CONFIRMED":
      return "Potvrzeno";
    case "IN_PROGRESS":
      return "Probíhá";
    case "COMPLETED":
      return "Dokončeno";
    case "CANCELLED":
      return "Zrušeno";
    case "DRAFT":
      return "Koncept";
    default:
      return status;
  }
}

export function EventCard({ event, onPress, showPayment = false }: EventCardProps) {
  const colors = useColors();
  const statusColor = getStatusColor(event.status, colors);
  const date = new Date(event.date);
  const dayName = date.toLocaleDateString("cs-CZ", { weekday: "short" });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString("cs-CZ", { month: "short" });

  const assignmentBadge = getAssignmentBadge(event.myAssignmentStatus);
  const paymentBadge = showPayment ? getPaymentBadge(event.myPaymentStatus) : null;
  const assignmentColor = colors[assignmentBadge.color] as string;
  const paymentColor = paymentBadge
    ? (colors[paymentBadge.color] as string)
    : null;

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
        <Text style={[styles.time, { color: colors.primary }]}>{event.startTime}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {event.name}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(event.status)}
            </Text>
          </View>
        </View>

        <View style={styles.pillsRow}>
          <View
            style={[
              styles.attendancePill,
              { backgroundColor: assignmentColor + "18" },
            ]}
          >
            <Feather name={assignmentBadge.icon} size={11} color={assignmentColor} />
            <Text style={[styles.attendanceText, { color: assignmentColor }]}>
              {assignmentBadge.label}
            </Text>
          </View>

          {paymentBadge && paymentColor && (
            <View
              style={[
                styles.attendancePill,
                { backgroundColor: paymentColor + "18" },
              ]}
            >
              <Feather
                name={paymentBadge.label === "Zaplaceno" ? "dollar-sign" : "clock"}
                size={11}
                color={paymentColor}
              />
              <Text style={[styles.attendanceText, { color: paymentColor }]}>
                {paymentBadge.label}
                {event.myPaymentAmount
                  ? ` · ${event.myPaymentAmount} Kč`
                  : ""}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {event.guestsTotal} hostů
            </Text>
          </View>
          {event.venue && (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {event.venue}
              </Text>
            </View>
          )}
          {event.language && event.language !== "CZ" && (
            <View style={styles.metaItem}>
              <Feather name="globe" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {event.language}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Feather name="chevron-right" size={18} color={colors.border} />
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
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  attendancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  attendanceText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
});

/** @deprecated Ponecháno pro zpětnou kompatibilitu existujících importů `Event`. */
export type Event = EventListItem;
