import { Stack } from "expo-router";
import { colors } from "@/constants/theme";
import { AuthProvider } from "@/lib/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerBackTitle: "Back",
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleAlign: "center",
          headerTitleStyle: { color: colors.text, fontSize: 17, fontWeight: "800" }
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: "LABTRACK" }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false, title: "Sign In" }} />
        <Stack.Screen name="scan" options={{ title: "Scan QR" }} />
        <Stack.Screen name="asset/[payload]" options={{ title: "Asset Details" }} />
        <Stack.Screen name="bookings" options={{ title: "My Bookings" }} />
        <Stack.Screen name="reports" options={{ title: "Defect Reports" }} />
        <Stack.Screen name="ticket" options={{ title: "Tickets" }} />
        <Stack.Screen name="ticket/[threadId]" options={{ title: "Ticket Chat" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      </Stack>
    </AuthProvider>
  );
}
