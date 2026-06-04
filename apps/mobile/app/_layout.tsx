import { Stack } from "expo-router";
import { AuthProvider, useCurrentProfile } from "@/lib/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
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
