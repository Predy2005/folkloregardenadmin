import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/stores/authStore";

const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 6;

/**
 * PIN-only přihlášení — uživatel zadá svůj globálně unikátní 4-6místný PIN
 * a backend ho dohledá podle deterministického HMAC hashe (bez identifieru).
 * Žádný e-mail / telefon — vhodné pro personál, který má jen telefon.
 *
 * Fallback: link "Přihlásit heslem" → `/login` (pro admin / situace, kdy si
 * uživatel PIN nepamatuje).
 */
export default function PinUnlockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const loginWithPinOnly = useAuthStore((s) => s.loginWithPinOnly);

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (pin.length < PIN_MIN_LENGTH) return;
    setLoading(true);
    setError(null);
    try {
      await loginWithPinOnly(pin);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      router.replace("/(tabs)");
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : "Nesprávný PIN");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  function onDigit(d: string) {
    if (loading) return;
    if (pin.length >= PIN_MAX_LENGTH) return;
    void Haptics.selectionAsync();
    setPin(pin + d);
    setError(null);
  }

  function onBackspace() {
    if (loading) return;
    setPin(pin.slice(0, -1));
    setError(null);
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24),
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Logo size={56} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Zadej PIN
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {`${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} číslic`}
        </Text>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: PIN_MAX_LENGTH }).map((_, i) => {
          const filled = i < pin.length;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: filled ? colors.primary : "transparent",
                  borderColor: error ? colors.destructive : colors.border,
                },
              ]}
            />
          );
        })}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {error}
        </Text>
      ) : (
        <View style={styles.errorPlaceholder} />
      )}

      <Keypad onDigit={onDigit} onBackspace={onBackspace} colors={colors} />

      <TouchableOpacity
        style={[
          styles.confirmBtn,
          {
            backgroundColor: colors.primary,
            opacity: pin.length >= PIN_MIN_LENGTH && !loading ? 1 : 0.4,
          },
        ]}
        onPress={() => void submit()}
        disabled={pin.length < PIN_MIN_LENGTH || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmBtnText}>Potvrdit</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footerActions}>
        <TouchableOpacity onPress={() => router.replace("/login")}>
          <Text style={[styles.footerLink, { color: colors.primary }]}>
            Přihlásit heslem
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Keypad({
  onDigit,
  onBackspace,
  colors,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const rows: Array<Array<string | "backspace" | null>> = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [null, "0", "backspace"],
  ];
  return (
    <View style={styles.keypad}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.keypadRow}>
          {row.map((cell, ci) => {
            if (cell === null) {
              return <View key={ci} style={styles.keypadKey} />;
            }
            if (cell === "backspace") {
              return (
                <TouchableOpacity
                  key={ci}
                  style={[styles.keypadKey, { borderColor: "transparent" }]}
                  onPress={onBackspace}
                  activeOpacity={0.6}
                >
                  <Feather
                    name="delete"
                    size={24}
                    color={colors.foreground}
                  />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={ci}
                style={[
                  styles.keypadKey,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onDigit(cell)}
                activeOpacity={0.6}
              >
                <Text
                  style={[styles.keypadDigit, { color: colors.foreground }]}
                >
                  {cell}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 28,
  },
  logoWrap: {
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  dots: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    height: 20,
    marginBottom: 16,
  },
  errorPlaceholder: {
    height: 20,
    marginBottom: 16,
  },
  keypad: {
    gap: 16,
    marginBottom: 16,
  },
  keypadRow: {
    flexDirection: "row",
    gap: 16,
  },
  keypadKey: {
    width: 74,
    height: 74,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keypadDigit: {
    fontSize: 26,
    fontFamily: "Inter_600SemiBold",
  },
  confirmBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
    minWidth: 220,
    marginBottom: 12,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  footerActions: {
    flexDirection: "row",
    gap: 24,
    marginTop: "auto",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
