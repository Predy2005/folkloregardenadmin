import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/stores/authStore";
import { useColors } from "@/hooks/useColors";
import { secureGet } from "@/lib/secureStorage";

/**
 * Routing gate po bootu aplikace.
 *
 *   loading                              → spinner
 *   !user && fg.identifier v SecureStore → /pin-unlock (PIN rychlý login)
 *   !user                                → /login
 *   user && role === null                → informační fallback (nemá mobilní roli)
 *   user && role ∈ {"staff", "driver"}   → /(tabs)
 *
 * Role už není volitelná uživatelem — derivuje se ze `user.roles` vrácených
 * z /api/mobile/auth/me (STAFF_WAITER/COOK → "staff", STAFF_DRIVER → "driver").
 * Pokud backend žádnou mobilní roli nevrátí, admin musí staff-member na
 * profilu doplnit pozici a znovu vytvořit mobilní účet.
 */
export default function IndexScreen() {
  const { user, role, isLoading } = useAuth();
  const colors = useColors();
  const [hasStoredIdentifier, setHasStoredIdentifier] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    void (async () => {
      const id = await secureGet("identifier");
      setHasStoredIdentifier(!!id);
    })();
  }, []);

  if (isLoading || hasStoredIdentifier === null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    // `/pin-unlock` je nová route z PR5; expo-router typedRoutes vygeneruje
    // typy až při `expo start`, do té doby zalijeme cast na `never`.
    const target = hasStoredIdentifier
      ? ("/pin-unlock" as never)
      : ("/login" as const);
    return <Redirect href={target} />;
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
    gap: 12,
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
