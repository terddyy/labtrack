import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: "800" }
      }}
    >
      <Stack.Screen name="index" options={{ title: "LABTRACK" }} />
      <Stack.Screen name="scan" options={{ title: "Scan QR" }} />
      <Stack.Screen name="asset/[payload]" options={{ title: "Asset Details" }} />
      <Stack.Screen name="bookings" options={{ title: "My Bookings" }} />
      <Stack.Screen name="reports" options={{ title: "Defect Reports" }} />
      <Stack.Screen name="ticket" options={{ title: "Ticket Chat" }} />
    </Stack>
  );
}
