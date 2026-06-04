import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function ProtectedLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: "Back",
        headerTintColor: colors.surface,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.primary },
        headerTitleAlign: "center",
        headerTitleStyle: { color: colors.surface, fontSize: 17, fontWeight: "900" }
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "LABTRACK" }} />
      <Stack.Screen name="asset/[payload]" options={{ title: "Asset Details" }} />
      <Stack.Screen name="reports" options={{ title: "Defect Reports" }} />
      <Stack.Screen name="ticket" options={{ title: "Tickets" }} />
      <Stack.Screen name="ticket/[threadId]" options={{ title: "Ticket Chat" }} />
    </Stack>
  );
}
