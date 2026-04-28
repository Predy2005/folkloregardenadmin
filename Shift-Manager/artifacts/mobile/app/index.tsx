import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/stores/authStore";
import { useColors } from "@/hooks/useColors";

/**
 * Routing gate po bootu aplikace.
 *
 *   loading                            → spinner
 *   !user                              → /pin-unlock (PIN-only login je default)
 *   user && role === null              → informační fallback (nemá mobilní roli)
 *   user && role ∈ {"staff", "driver"} → /(tabs)
 *
 * PIN je primární login — personál nemá e-mail, jen telefon, takže zadání
 * 4-6místného globálně unikátního PINu je nejjednodušší cesta. Heslový login
 * je dostupný jako fallback z odkazu na PIN obrazovce.
 *
 * Role už není volitelná uživatelem — derivuje se ze `user.roles` vrácených
 * z /api/mobile/auth/me (STAFF_WAITER/COOK → "staff", STAFF_DRIVER → "driver").
 */
export default function IndexScreen() {
  const { user, role, isLoading } = useAuth();
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Logo size={96} />
        <Text style={[styles.appName, { color: colors.foreground }]}>
          Folklore Garden
        </Text>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    // expo-router typedRoutes vygeneruje typy až při `expo start`,
    // do té doby zalijeme cast na `never`.
    return <Redirect href={"/pin-unlock" as never} />;
  }

  if (role === null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Účet bez mobilní role
        </Text>
        <Text style={[styles.text, { color: colors.mutedForeground }]}>
          Tento účet nemá přiřazenou žádnou mobilní roli (STAFF_WAITER, STAFF_COOK, STAFF_DRIVER).
          Kontaktuj administrátora, ať ti v CRM doplní pozici a znovu vytvoří mobilní přístup.
        </Text>
      </View>
    );
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  appName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
    marginTop: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  text: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
