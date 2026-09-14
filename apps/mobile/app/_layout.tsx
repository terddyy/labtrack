import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useCurrentProfile } from "@/lib/auth";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Every screen opens on an ink header, so the status bar stays light. */}
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const auth = useCurrentProfile();
  const isReady = auth.status === "ready";

  return (
    <Stack>
      <Stack.Protected guard={isReady}>
        <Stack.Screen name="(protected)" options={{ headerShown: false, title: "LABTRACK" }} />
      </Stack.Protected>
      <Stack.Protected guard={!isReady}>
        <Stack.Screen name="sign-in" options={{ headerShown: false, title: "Sign In" }} />
      </Stack.Protected>
    </Stack>
  );
}
