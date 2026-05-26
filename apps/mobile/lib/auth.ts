import { createContext, createElement, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import type { Profile } from "@labtrack/shared";
import { formatApiError, getCurrentProfile, hasSupabaseConfig, signOut } from "@/lib/labtrack-api";

export type AuthState =
  | { status: "missing-config"; profile: null; error: null }
  | { status: "loading"; profile: null; error: null }
  | { status: "signed-out"; profile: null; error: null }
  | { status: "inactive"; profile: Profile; error: null }
  | { status: "ready"; profile: Profile; error: null }
  | { status: "error"; profile: null; error: string };

export type CurrentProfile = AuthState & {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<CurrentProfile | null>(null);

function useCurrentProfileState(): CurrentProfile {
  const [state, setState] = useState<AuthState>(() => (
    hasSupabaseConfig()
      ? { status: "loading", profile: null, error: null }
      : { status: "missing-config", profile: null, error: null }
  ));

  const refresh = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setState({ status: "missing-config", profile: null, error: null });
      return;
    }

    setState({ status: "loading", profile: null, error: null });

    try {
      const profile = await getCurrentProfile();
      setState(
        profile
          ? profile.isActive
            ? { status: "ready", profile, error: null }
            : { status: "inactive", profile, error: null }
          : { status: "signed-out", profile: null, error: null }
      );
    } catch (error) {
      setState({ status: "error", profile: null, error: formatApiError(error) });
    }
  }, []);

  const signOutAndRefresh = useCallback(async () => {
    await signOut();
    setState({ status: "signed-out", profile: null, error: null });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh, signOut: signOutAndRefresh };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useCurrentProfileState();

  return createElement(AuthContext.Provider, { value: auth }, children);
}

export function useCurrentProfile() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error("useCurrentProfile must be used within AuthProvider.");
  }

  return auth;
}
