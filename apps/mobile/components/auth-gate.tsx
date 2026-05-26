import { router } from "expo-router";
import { type ReactNode, useEffect } from "react";
import { Button, Card, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { useCurrentProfile } from "@/lib/auth";

export function RequireActiveProfile({ children }: { children: ReactNode }) {
  const auth = useCurrentProfile();

  useEffect(() => {
    if (auth.status === "signed-out") {
      router.replace("/sign-in");
    }
  }, [auth.status]);

  if (auth.status === "ready") {
    return children;
  }

  if (auth.status === "missing-config") {
    return (
      <GateScreen>
        <Notice tone="warning">Supabase mobile configuration is missing. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.</Notice>
      </GateScreen>
    );
  }

  if (auth.status === "inactive") {
    return (
      <GateScreen>
        <Card>
          <SectionTitle title="Account inactive" caption="This LABTRACK profile has been deactivated. Contact an administrator before using equipment workflows." />
          <Button onPress={() => void auth.signOut()} variant="secondary">Sign out</Button>
        </Card>
      </GateScreen>
    );
  }

  if (auth.status === "error") {
    return (
      <GateScreen>
        <Notice tone="danger">{auth.error}</Notice>
        <Button onPress={() => void auth.refresh()} variant="secondary">Try Again</Button>
      </GateScreen>
    );
  }

  return (
    <GateScreen>
      <Card>
        <SectionTitle title={auth.status === "signed-out" ? "Opening sign in" : "Checking account"} caption="LABTRACK is verifying your profile before opening this screen." />
      </Card>
    </GateScreen>
  );
}

function GateScreen({ children }: { children: ReactNode }) {
  return <ScreenScrollView>{children}</ScreenScrollView>;
}
