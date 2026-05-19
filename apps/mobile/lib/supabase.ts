import AsyncStorage from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: {
          getItem: (key) => AsyncStorage.getItemAsync(key),
          setItem: (key, value) => AsyncStorage.setItemAsync(key, value),
          removeItem: (key) => AsyncStorage.deleteItemAsync(key)
        },
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true
      }
    })
  : null;
