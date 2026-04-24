import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { secureDelete, secureGet } from "@/lib/secureStorage";
import { useAuthStore } from "@/stores/authStore";

const PIN_LENGTH = 4;

/**
 * Rychlý PIN unlock — pokud user už dřív úspěšně přihlášen heslem, jeho
 * `identifier` je v SecureStore (`fg.identifier`). Tahle obrazovka ho nechá
 * napsat 4 číslice a zavolá `authStore.loginWithPin`.
 *
 * Fallback: link "Přihlásit heslem" → `/login`.
 * "Odhlásit tento účet" — smaže identifier + jde na /login (pro případ,
 * že device sdílí víc uživatelů).
 */
export default function PinUnlockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const loginWithPin = useAuthStore((s) => s.loginWithPin);

  const [identifier, setIdentifier] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const id = await secureGet("identifier");
      if (!id) {
        // Nemáme identifier → nelze se PIN přihlásit, jdi na password login.
        router.replace("/login");
        return;
      }
      setIdentifier(id);
    })();
  }, [router]);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH || !identifier) return;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function submit() {
    if (!identifier) return;
    setLoading(true);
    setError(null);
    try {
      await loginWithPin(identifier, pin);
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
    if (pin.length >= PIN_LENGTH) return;
    void Haptics.selectionAsync();
    setPin(pin + d);
    setError(null);
  }

  function onBackspace() {
    if (loading) return;
    setPin(pin.slice(0, -1));
    setError(null);
  }

  async function switchAccount() {
    await secureDelete("identifier");
    router.replace("/login");
  }

  if (identifier === null) {
    return (
      <View
        style={[styles.center, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const masked = identifier.includes("@")
    ? identifier.replace(/^(.{2}).*(@.*)$/, "$1***$2")
    : identifier;

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
        <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
          <Feather name="lock" size={28} color="#fff" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Zadej PIN
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Pro účet {masked}
        </Text>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
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

      <View style={styles.footerActions}>
        <TouchableOpacity onPress={() => router.replace("/login")}>
          <Text style={[styles.footerLink, { color: colors.primary }]}>
            Přihlásit heslem
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => void switchAccount()}>
          <Text style={[styles.footerLink, { color: colors.mutedForeground }]}>
            Jiný účet
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
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
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
    gap: 16,
    marginBottom: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
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
    marginBottom: 24,
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
