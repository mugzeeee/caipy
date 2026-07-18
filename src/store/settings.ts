import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { Settings } from "@/types";

// Server URL + API key are sensitive-ish, so they live in the Keychain
// (SecureStore). The rest of the settings persist in AsyncStorage.
// This wrapper adapts SecureStore to the zustand persist Storage shape.

const SECURE_URL_KEY = "caipy.server.url";
const SECURE_APIKEY_KEY = "caipy.server.apikey";

async function readSecure(): Promise<{ baseUrl: string; apiKey: string }> {
  try {
    const [baseUrl, apiKey] = await Promise.all([
      SecureStore.getItemAsync(SECURE_URL_KEY),
      SecureStore.getItemAsync(SECURE_APIKEY_KEY),
    ]);
    return { baseUrl: baseUrl ?? "", apiKey: apiKey ?? "" };
  } catch {
    return { baseUrl: "", apiKey: "" };
  }
}

async function writeSecure(baseUrl: string, apiKey: string): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(SECURE_URL_KEY, baseUrl),
      apiKey
        ? SecureStore.setItemAsync(SECURE_APIKEY_KEY, apiKey)
        : SecureStore.deleteItemAsync(SECURE_APIKEY_KEY),
    ]);
  } catch {
    // SecureStore unavailable (simulator without keychain) — fail soft.
  }
}

interface SettingsState {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  theme: "dark" | "light";

  setBaseUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  setMaxTokens: (n: number) => void;
  setTheme: (t: "dark" | "light") => void;
  hydrateSecure: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      baseUrl: "",
      apiKey: "",
      model: "",
      maxTokens: 512,
      theme: "dark",

      setBaseUrl: (url) => {
        set({ baseUrl: url });
        writeSecure(url, useSettingsStore.getState().apiKey);
      },
      setApiKey: (key) => {
        set({ apiKey: key });
        writeSecure(useSettingsStore.getState().baseUrl, key);
      },
      setModel: (model) => set({ model }),
      setMaxTokens: (n) => set({ maxTokens: n }),
      setTheme: (t) => set({ theme: t }),

      // Call once on startup to pull the Keychain values into state.
      hydrateSecure: async () => {
        const s = await readSecure();
        set({ baseUrl: s.baseUrl, apiKey: s.apiKey });
      },
    }),
    {
      name: "caipy.settings",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the non-sensitive bits here; secrets come from SecureStore
      partialize: (s) => ({
        model: s.model,
        maxTokens: s.maxTokens,
        theme: s.theme,
      }),
    }
  )
);

export const defaultSettings: Settings = {
  baseUrl: "http://192.168.1.50:1234/v1",
  model: "",
  maxTokens: 512,
  theme: "dark",
};
