import React from "react";
import { View, StyleSheet } from "react-native";
import { useAuth } from "@/stores/authStore";
import { useColors } from "@/hooks/useColors";
import { StaffEventsScreen } from "@/screens/StaffEventsScreen";
import { DriverTransportsScreen } from "@/screens/DriverTransportsScreen";

export default function HomeTab() {
  const { role } = useAuth();
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {role === "driver" ? <DriverTransportsScreen /> : <StaffEventsScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
