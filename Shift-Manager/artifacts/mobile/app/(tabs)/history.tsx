import { Redirect } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { StaffHistoryScreen } from "@/screens/StaffHistoryScreen";
import { useAuth } from "@/stores/authStore";

/**
 * Historie tab — jen pro staff. Driver historii přepravy zatím samostatně
 * neřešíme; redirectneme zpět na hlavní tab, kde má řidič seznam jízd.
 */
export default function HistoryTab() {
  const { role } = useAuth();
  const colors = useColors();

  if (role === "driver") {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StaffHistoryScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
