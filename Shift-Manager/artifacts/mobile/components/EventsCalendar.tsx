import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

/**
 * Lightweight kalendář pro mobilku — měsíc nebo týden.
 *
 * Bez externí knihovny: vlastní implementace přes nativní `Date`. Markované
 * dny dostává jako mapu `{ "YYYY-MM-DD" → count }` (počet akcí toho dne).
 *
 * Týden je pondělí–neděle (CZ konvence). Měsíční grid má vždy 6 řádků
 * (7×6=42 buněk), aby výška UI byla stabilní mezi měsíci.
 */

export type CalendarMode = "month" | "week";

interface EventsCalendarProps {
  mode: CalendarMode;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  /** Klíč ve tvaru YYYY-MM-DD → počet akcí toho dne. */
  markedDates: Map<string, number>;
}

const WEEK_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

const MONTH_LABELS = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  // JS getDay(): 0=Sunday … 6=Saturday. Posun na pondělí.
  const offset = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function EventsCalendar({
  mode,
  selectedDate,
  onSelectDate,
  markedDates,
}: EventsCalendarProps) {
  const colors = useColors();
  const [viewDate, setViewDate] = useState<Date>(() => new Date(selectedDate));
  const today = new Date();

  const cells = useMemo<Date[]>(() => {
    if (mode === "week") {
      const start = startOfWeekMonday(viewDate);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    // Měsíční grid 6×7 — začíná pondělím týdne, který obsahuje 1. dne měsíce.
    const monthStart = startOfMonth(viewDate);
    const gridStart = startOfWeekMonday(monthStart);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [viewDate, mode]);

  function nav(direction: -1 | 1) {
    void Haptics.selectionAsync();
    if (mode === "week") {
      setViewDate(addDays(viewDate, direction * 7));
    } else {
      setViewDate(addMonths(viewDate, direction));
    }
  }

  function jumpToToday() {
    void Haptics.selectionAsync();
    const now = new Date();
    setViewDate(now);
    onSelectDate(now);
  }

  const headerLabel =
    mode === "week"
      ? `${cells[0].getDate()}. ${MONTH_LABELS[cells[0].getMonth()].toLowerCase()} – ${cells[6].getDate()}. ${MONTH_LABELS[cells[6].getMonth()].toLowerCase()} ${cells[6].getFullYear()}`
      : `${MONTH_LABELS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav(-1)} style={styles.navBtn}>
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <TouchableOpacity onPress={jumpToToday} style={styles.headerLabelWrap}>
          <Text style={[styles.headerLabel, { color: colors.foreground }]}>
            {headerLabel}
          </Text>
          <Text style={[styles.headerHint, { color: colors.mutedForeground }]}>
            Klepnutím na dnes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => nav(1)} style={styles.navBtn}>
          <Feather name="chevron-right" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeader}>
        {WEEK_LABELS.map((label) => (
          <Text
            key={label}
            style={[styles.weekLabel, { color: colors.mutedForeground }]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          const inCurrentMonth =
            mode === "week" || cell.getMonth() === viewDate.getMonth();
          const isToday = isSameDay(cell, today);
          const isSelected = isSameDay(cell, selectedDate);
          const eventCount = markedDates.get(dateKey(cell)) ?? 0;

          const cellBg = isSelected
            ? colors.primary
            : isToday
              ? colors.primary + "18"
              : "transparent";
          const numColor = isSelected
            ? "#fff"
            : inCurrentMonth
              ? colors.foreground
              : colors.mutedForeground;
          const dotColor = isSelected ? "#fff" : colors.primary;

          return (
            <TouchableOpacity
              key={dateKey(cell)}
              onPress={() => {
                void Haptics.selectionAsync();
                onSelectDate(cell);
              }}
              style={[styles.cell, { backgroundColor: cellBg }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.cellNum, { color: numColor }]}>
                {cell.getDate()}
              </Text>
              {eventCount > 0 && (
                <View
                  style={[styles.cellDot, { backgroundColor: dotColor }]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  navBtn: {
    padding: 6,
  },
  headerLabelWrap: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  headerLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  headerHint: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  weekHeader: {
    flexDirection: "row",
    paddingTop: 4,
    paddingBottom: 2,
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    gap: 2,
  },
  cellNum: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  cellDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
