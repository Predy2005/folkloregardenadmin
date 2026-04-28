import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/stores/authStore";
import { useEvent, type EventDetail } from "@/hooks/queries/useEvents";
import {
  useTransport,
  type TransportDetail,
} from "@/hooks/queries/useTransports";
import {
  useTransportStatusMutation,
  type TransportStatus,
} from "@/hooks/mutations/useTransportStatus";
import { useEventResponseMutation } from "@/hooks/mutations/useEventResponse";

const DECLINE_REASONS = [
  "Nemoc",
  "Dovolená",
  "Rodinné důvody",
  "Jiné",
] as const;
type DeclineReasonOption = (typeof DECLINE_REASONS)[number];

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={15} color={colors.mutedForeground} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role } = useAuth();
  const { id, type } = useLocalSearchParams<{
    id: string;
    type?: "event" | "transport";
  }>();

  // Typ detailu je buď explicitní přes query (?type=event|transport), nebo
  // se odvodí z UI role. Driver vidí transport, staff vidí event.
  const detailType: "event" | "transport" =
    type === "transport" || (!type && role === "driver") ? "transport" : "event";

  const eventQuery = useEvent(detailType === "event" ? id : undefined);
  const transportQuery = useTransport(
    detailType === "transport" ? id : undefined,
  );
  const active = detailType === "event" ? eventQuery : transportQuery;
  const eventDetail = eventQuery.data;
  const transportDetail = transportQuery.data;
  const isPending = active.isPending;
  const error = active.error;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {detailType === "transport" ? "Detail jízdy" : "Detail akce"}
        </Text>
        <View style={{ width: 32 }} />
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
            onPress={() => void active.refetch()}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>
              Zkusit znovu
            </Text>
          </TouchableOpacity>
        </View>
      ) : detailType === "event" && eventDetail ? (
        <EventBody detail={eventDetail} insets={insets} colors={colors} />
      ) : detailType === "transport" && transportDetail ? (
        <TransportBody detail={transportDetail} insets={insets} colors={colors} />
      ) : null}
    </View>
  );
}

// ─── Staff: event detail body ───────────────────────────────────────────

function EventBody({
  detail,
  insets,
  colors,
}: {
  detail: EventDetail;
  insets: ReturnType<typeof useSafeAreaInsets>;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) },
      ]}
    >
      <View style={styles.dateHeader}>
        <Text style={[styles.dateStr, { color: colors.foreground }]}>
          {new Date(detail.date).toLocaleDateString("cs-CZ", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {" — "}
          {detail.startTime}
        </Text>
        <Text style={[styles.eventName, { color: colors.foreground }]}>
          {detail.name}
        </Text>
      </View>

      <ResponseActions detail={detail} colors={colors} />

      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Akce</Text>
        <InfoRow label="Typ" value={detail.eventType} icon="tag" />
        <InfoRow label="Místo" value={detail.venue} icon="map-pin" />
        <InfoRow
          label="Délka"
          value={`${detail.durationMinutes} min`}
          icon="clock"
        />
        <InfoRow
          label="Hosté"
          value={`${detail.guestsTotal} (${detail.guestsPaid} placených, ${detail.guestsFree} volných)`}
          icon="users"
        />
        <InfoRow label="Jazyk" value={detail.language} icon="globe" />
        <InfoRow
          label="Poznámka pro personál"
          value={detail.notesStaff}
          icon="file-text"
        />
      </View>

      {detail.schedule && detail.schedule.length > 0 && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Harmonogram
          </Text>
          {detail.schedule.map((s) => (
            <View key={s.id} style={styles.scheduleRow}>
              <Text style={[styles.scheduleTime, { color: colors.primary }]}>
                {s.time}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.scheduleActivity, { color: colors.foreground }]}>
                  {s.activity}
                </Text>
                {s.description && (
                  <Text
                    style={[styles.scheduleDescription, { color: colors.mutedForeground }]}
                  >
                    {s.description}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {detail.menu && detail.menu.length > 0 && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Menu</Text>
          {detail.menu.map((m) => (
            <View key={m.id} style={styles.menuRow}>
              <Text style={[styles.menuName, { color: colors.foreground }]}>
                {m.menuName}
              </Text>
              <Text style={[styles.menuQty, { color: colors.primary }]}>
                {m.quantity}× {m.servingTime ? `(${m.servingTime})` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      {detail.beverages && detail.beverages.length > 0 && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Nápoje</Text>
          {detail.beverages.map((b) => (
            <View key={b.id} style={styles.menuRow}>
              <Text style={[styles.menuName, { color: colors.foreground }]}>
                {b.name}
              </Text>
              <Text style={[styles.menuQty, { color: colors.primary }]}>
                {b.quantity} {b.unit}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Driver: transport detail body ──────────────────────────────────────

function TransportBody({
  detail,
  insets,
  colors,
}: {
  detail: TransportDetail;
  insets: ReturnType<typeof useSafeAreaInsets>;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) },
      ]}
    >
      <View style={styles.dateHeader}>
        <Text style={[styles.dateStr, { color: colors.foreground }]}>
          {new Date(detail.eventDate).toLocaleDateString("cs-CZ", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {" — "}
          {detail.scheduledTime ?? detail.eventStartTime}
        </Text>
        <Text style={[styles.eventName, { color: colors.foreground }]}>
          {detail.eventName}
        </Text>
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.info }]}>Jízda</Text>
        <InfoRow label="Typ" value={detail.transportType} icon="git-merge" />
        <InfoRow
          label="Vyzvednutí"
          value={detail.pickupLocation}
          icon="map-pin"
        />
        <InfoRow
          label="Cíl"
          value={detail.dropoffLocation}
          icon="navigation"
        />
        <InfoRow
          label="Počet osob"
          value={detail.passengerCount?.toString()}
          icon="users"
        />
        <InfoRow label="Poznámka" value={detail.notes} icon="file-text" />
      </View>

      <TransportStatusActions detail={detail} colors={colors} />

      {detail.vehicle && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.info }]}>Vozidlo</Text>
          <InfoRow
            label="SPZ"
            value={detail.vehicle.licensePlate}
            icon="hash"
          />
          <InfoRow
            label="Model"
            value={
              [detail.vehicle.brand, detail.vehicle.model]
                .filter(Boolean)
                .join(" ") || null
            }
            icon="truck"
          />
          <InfoRow
            label="Kapacita"
            value={`${detail.vehicle.capacity} osob`}
            icon="users"
          />
        </View>
      )}

      {(detail.organizerPerson || detail.organizerPhone) && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.info }]}>
            Kontakt organizátora
          </Text>
          <InfoRow label="Osoba" value={detail.organizerPerson} icon="user" />
          <InfoRow label="Telefon" value={detail.organizerPhone} icon="phone" />
        </View>
      )}

      {detail.venue && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.info }]}>Místo akce</Text>
          <InfoRow label="Venue" value={detail.venue} icon="map" />
        </View>
      )}
    </ScrollView>
  );
}

// ─── Staff response actions (Potvrdit / Odhlásit) ───────────────────────

function ResponseActions({
  detail,
  colors,
}: {
  detail: EventDetail;
  colors: ReturnType<typeof useColors>;
}) {
  const mutation = useEventResponseMutation();
  const [declineOpen, setDeclineOpen] = useState(false);

  const status = detail.myAssignmentStatus;
  const locked =
    detail.responseLockedAt !== null &&
    new Date(detail.responseLockedAt).getTime() <= Date.now();

  async function confirm() {
    try {
      await mutation.mutateAsync({
        eventId: detail.eventId,
        response: "CONFIRMED",
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Nepodařilo se uložit",
        e instanceof Error ? e.message : "Zkus to prosím znovu.",
      );
    }
  }

  async function decline(reason: string) {
    try {
      await mutation.mutateAsync({
        eventId: detail.eventId,
        response: "DECLINED",
        reason,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeclineOpen(false);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Nepodařilo se uložit",
        e instanceof Error ? e.message : "Zkus to prosím znovu.",
      );
    }
  }

  // Lock — po 4h před akcí už se nedá nic měnit. Stav zachovaný.
  if (locked) {
    return (
      <View
        style={[
          styles.actionPanel,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <Feather name="lock" size={16} color={colors.mutedForeground} />
        <Text style={[styles.actionPanelText, { color: colors.foreground }]}>
          {status === "CONFIRMED"
            ? "Účast potvrzena (změny už nejsou možné)"
            : status === "DECLINED"
              ? "Odhlášeno (změny už nejsou možné)"
              : "Účast nelze měnit (méně než 4 h před akcí)"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.responseWrap}>
      {status === "CONFIRMED" && detail.myConfirmedAt && (
        <View
          style={[
            styles.responseStatusPill,
            { backgroundColor: colors.success + "18" },
          ]}
        >
          <Feather name="check-circle" size={14} color={colors.success} />
          <Text style={[styles.responseStatusText, { color: colors.success }]}>
            Účast potvrzena{" "}
            {new Date(detail.myConfirmedAt).toLocaleDateString("cs-CZ")}
          </Text>
        </View>
      )}
      {status === "DECLINED" && detail.myDeclineReason && (
        <View
          style={[
            styles.responseStatusPill,
            { backgroundColor: colors.warning + "18" },
          ]}
        >
          <Feather name="x-circle" size={14} color={colors.warning} />
          <Text style={[styles.responseStatusText, { color: colors.warning }]}>
            Odhlášeno: {detail.myDeclineReason}
          </Text>
        </View>
      )}

      <View style={styles.responseButtonsRow}>
        <TouchableOpacity
          style={[
            styles.responseButton,
            {
              backgroundColor:
                status === "CONFIRMED" ? colors.success : colors.primary,
              opacity: status === "CONFIRMED" ? 0.55 : 1,
            },
            mutation.isPending && styles.actionButtonDisabled,
          ]}
          onPress={() => void confirm()}
          disabled={mutation.isPending || status === "CONFIRMED"}
          activeOpacity={0.8}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>
                {status === "CONFIRMED" ? "Potvrzeno" : "Potvrdit účast"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.responseButton,
            {
              backgroundColor:
                status === "DECLINED" ? colors.warning : colors.destructive,
              opacity: status === "DECLINED" ? 0.55 : 1,
            },
            mutation.isPending && styles.actionButtonDisabled,
          ]}
          onPress={() => setDeclineOpen(true)}
          disabled={mutation.isPending || status === "DECLINED"}
          activeOpacity={0.8}
        >
          <Feather name="x" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>
            {status === "DECLINED" ? "Odhlášen" : "Odhlásit se"}
          </Text>
        </TouchableOpacity>
      </View>

      <DeclineDialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        onSubmit={(reason) => void decline(reason)}
        pending={mutation.isPending}
        colors={colors}
      />
    </View>
  );
}

function DeclineDialog({
  open,
  onClose,
  onSubmit,
  pending,
  colors,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  pending: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const [option, setOption] = useState<DeclineReasonOption>("Nemoc");
  const [customText, setCustomText] = useState("");

  function handleSubmit() {
    const reason =
      option === "Jiné" ? customText.trim() : option;
    if (!reason) return;
    onSubmit(reason);
  }

  const submitDisabled =
    pending || (option === "Jiné" && customText.trim() === "");

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Odhlásit se z akce
          </Text>
          <Text
            style={[styles.modalSubtitle, { color: colors.mutedForeground }]}
          >
            Vyber důvod — manažer ho uvidí v CRM.
          </Text>

          <View style={styles.modalOptions}>
            {DECLINE_REASONS.map((opt) => {
              const active = option === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setOption(opt)}
                  style={[
                    styles.modalOption,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active
                        ? colors.primary + "12"
                        : "transparent",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={active ? "check-circle" : "circle"}
                    size={16}
                    color={active ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: colors.foreground },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {option === "Jiné" && (
            <TextInput
              value={customText}
              onChangeText={setCustomText}
              placeholder="Napiš důvod…"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.modalInput,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.background,
                },
              ]}
              multiline
              maxLength={500}
            />
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.modalBtn, { borderColor: colors.border }]}
              disabled={pending}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.modalBtnText, { color: colors.foreground }]}
              >
                Zrušit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.modalBtn,
                {
                  backgroundColor: colors.destructive,
                  borderColor: colors.destructive,
                  opacity: submitDisabled ? 0.5 : 1,
                },
              ]}
              disabled={submitDisabled}
              activeOpacity={0.8}
            >
              {pending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Odhlásit
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Driver status actions ──────────────────────────────────────────────

function TransportStatusActions({
  detail,
  colors,
}: {
  detail: TransportDetail;
  colors: ReturnType<typeof useColors>;
}) {
  const mutation = useTransportStatusMutation();
  const executionStatus = detail.executionStatus;

  async function run(next: TransportStatus) {
    try {
      const result = await mutation.mutateAsync({ id: detail.id, status: next });
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      if (result.queued) {
        Alert.alert(
          "Uloženo pro pozdější synchronizaci",
          "Jsi offline. Jakmile bude signál, zápis se odešle.",
        );
      }
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Nepodařilo se uložit",
        e instanceof Error ? e.message : "Zkus to prosím znovu.",
      );
    }
  }

  if (executionStatus === "DONE") {
    return (
      <View
        style={[
          styles.actionPanel,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <Feather name="check-circle" size={18} color={colors.success} />
        <Text style={[styles.actionPanelText, { color: colors.foreground }]}>
          Jízda ukončena
        </Text>
      </View>
    );
  }

  const nextStatus: TransportStatus =
    executionStatus === "IN_PROGRESS" ? "DONE" : "IN_PROGRESS";
  const label =
    nextStatus === "DONE" ? "Dokončit jízdu" : "Zahájit jízdu";
  const icon = nextStatus === "DONE" ? "check" : "play";

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        {
          backgroundColor:
            nextStatus === "DONE" ? colors.success : colors.info,
        },
        mutation.isPending && styles.actionButtonDisabled,
      ]}
      onPress={() => void run(nextStatus)}
      disabled={mutation.isPending}
      activeOpacity={0.8}
    >
      {mutation.isPending ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Feather name={icon} size={18} color="#fff" />
          <Text style={styles.actionButtonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
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
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontSize: 15,
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
  scroll: {
    padding: 16,
    gap: 14,
  },
  dateHeader: {
    gap: 8,
    paddingBottom: 4,
  },
  dateStr: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
  eventName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  infoContent: {
    flex: 1,
    gap: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  scheduleRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  scheduleTime: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    width: 48,
  },
  scheduleActivity: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  scheduleDescription: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  responseWrap: {
    gap: 10,
  },
  responseButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  responseButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 52,
  },
  responseStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  responseStatusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  modalOptions: {
    gap: 8,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalOptionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  modalBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  menuName: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  menuQty: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 52,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  actionButtonMeta: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  actionPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  actionPanelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
