import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function ProtectedLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: "Back",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.inkText,
        // Each screen renders its own ConsoleHeader title directly below this bar.
        headerTitle: "",
        headerTitleAlign: "center",
        headerTitleStyle: { color: colors.inkText, fontSize: 16, fontWeight: "600" }
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "LABTRACK" }} />
      <Stack.Screen name="asset/[payload]" options={{ title: "Asset" }} />
      <Stack.Screen name="reports" options={{ title: "Defect Reports" }} />
      <Stack.Screen name="ticket" options={{ title: "Support" }} />
      <Stack.Screen name="ticket/[threadId]" options={{ headerTitle: "Conversation", title: "Conversation" }} />
    </Stack>
  );
}
