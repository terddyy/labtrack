import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform, type AppStateStatus } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type AuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const memoryStorage = new Map<string, string>();
let hasWarnedAboutMemoryStorage = false;

function getWebStorage() {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function canUseSecureStore() {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

const authStorage: AuthStorage = {
  async getItem(key) {
    const webStorage = getWebStorage();

    if (webStorage) {
      return webStorage.getItem(key);
    }

    if (await canUseSecureStore()) {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        warnAuthStorageFallback();
        return memoryStorage.get(key) ?? null;
      }
    }

    warnAuthStorageFallback();
    return memoryStorage.get(key) ?? null;
  },
  async setItem(key, value) {
    const webStorage = getWebStorage();

    if (webStorage) {
      webStorage.setItem(key, value);
      return;
    }

    if (await canUseSecureStore()) {
      try {
        await SecureStore.setItemAsync(key, value);
        return;
      } catch {
        warnAuthStorageFallback();
        memoryStorage.set(key, value);
        return;
      }
    }

    warnAuthStorageFallback();
    memoryStorage.set(key, value);
  },
  async removeItem(key) {
    const webStorage = getWebStorage();

    if (webStorage) {
      webStorage.removeItem(key);
      return;
    }

    if (await canUseSecureStore()) {
      try {
        await SecureStore.deleteItemAsync(key);
        return;
      } catch {
        warnAuthStorageFallback();
        memoryStorage.delete(key);
        return;
      }
    }

    memoryStorage.delete(key);
  }
};

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true
      }
    })
  : null;

export function subscribeToSupabaseAppStateRefresh() {
  if (!supabase || Platform.OS === "web") {
    return () => undefined;
  }

  const client = supabase;
  const syncAutoRefresh = (state: AppStateStatus) => {
    if (state === "active") {
      client.auth.startAutoRefresh();
    } else {
      client.auth.stopAutoRefresh();
    }
  };

  syncAutoRefresh(AppState.currentState);
  const subscription = AppState.addEventListener("change", syncAutoRefresh);

  return () => {
    subscription.remove();
    client.auth.stopAutoRefresh();
  };
}

function warnAuthStorageFallback() {
  if (hasWarnedAboutMemoryStorage) {
    return;
  }

  hasWarnedAboutMemoryStorage = true;
  console.warn("Supabase auth storage fell back to memory; sessions may not survive app restart.");
}
