import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useCurrentProfile } from "@/lib/auth";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
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
