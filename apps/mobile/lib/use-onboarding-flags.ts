import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

const SCAN_FLOW_KEY = "onboarding_scan_flow_v1";
const BORROW_FLOW_KEY = "onboarding_borrow_flow_v1";

type OnboardingFlag = "scan" | "borrow";

const KEYS: Record<OnboardingFlag, string> = {
  scan: SCAN_FLOW_KEY,
  borrow: BORROW_FLOW_KEY
};

async function readFlag(key: string): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        return false;
      }

      return window.localStorage.getItem(key) === "1";
    }

    const value = await SecureStore.getItemAsync(key);
    return value === "1";
  } catch {
    return false;
  }
}

async function writeFlag(key: string, seen: boolean): Promise<void> {
  const value = seen ? "1" : "0";

  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        return;
      }

      if (seen) {
        window.localStorage.setItem(key, value);
      } else {
        window.localStorage.removeItem(key);
      }

      return;
    }

    if (seen) {
      await SecureStore.setItemAsync(key, value);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // ponytail: best-effort persistence; coach may reappear if store fails
  }
}

export function useOnboardingFlag(flag: OnboardingFlag) {
  const key = KEYS[flag];
  const [hasSeen, setHasSeen] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    void readFlag(key).then((seen) => {
      if (mounted) {
        setHasSeen(seen);
        setIsReady(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [key]);

  const markSeen = useCallback(async () => {
    setHasSeen(true);
    await writeFlag(key, true);
  }, [key]);

  const reset = useCallback(async () => {
    setHasSeen(false);
    await writeFlag(key, false);
  }, [key]);

  return { hasSeen, isReady, markSeen, reset };
}
