import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { Provider, Settings } from "@/types";
import { PROVIDER_DEFAULTS } from "@/api/chat";

// Server URL + API key + ComfyUI URL are sensitive-ish, so they live in the
// Keychain (SecureStore). The rest of the settings persist in AsyncStorage.
// This wrapper adapts SecureStore to the zustand persist Storage shape.

const SECURE_URL_KEY = "caipy.server.url";
const SECURE_APIKEY_KEY = "caipy.server.apikey";
const SECURE_COMFY_KEY = "caipy.comfy.url";

async function readSecure(): Promise<{
  baseUrl: string;
  apiKey: string;
  comfyUrl: string;
}> {
  try {
    const [baseUrl, apiKey, comfyUrl] = await Promise.all([
      SecureStore.getItemAsync(SECURE_URL_KEY),
      SecureStore.getItemAsync(SECURE_APIKEY_KEY),
      SecureStore.getItemAsync(SECURE_COMFY_KEY),
    ]);
    return {
      baseUrl: baseUrl ?? "",
      apiKey: apiKey ?? "",
      comfyUrl: comfyUrl ?? "",
    };
  } catch {
    return { baseUrl: "", apiKey: "", comfyUrl: "" };
  }
}

async function writeSecure(
  baseUrl: string,
  apiKey: string,
  comfyUrl: string
): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(SECURE_URL_KEY, baseUrl),
      apiKey
        ? SecureStore.setItemAsync(SECURE_APIKEY_KEY, apiKey)
        : SecureStore.deleteItemAsync(SECURE_APIKEY_KEY),
      comfyUrl
        ? SecureStore.setItemAsync(SECURE_COMFY_KEY, comfyUrl)
        : SecureStore.deleteItemAsync(SECURE_COMFY_KEY),
    ]);
  } catch {
    // SecureStore unavailable (simulator without keychain) — fail soft.
  }
}

interface SettingsState {
  provider: Provider;
  baseUrl: string;
  apiKey: string;
  comfyUrl: string;
  model: string;
  maxTokens: number;
  assistantSystemPrompt: string;
  theme: "dark" | "light";

  setProvider: (p: Provider) => void;
  setBaseUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setComfyUrl: (url: string) => void;
  setModel: (model: string) => void;
  setMaxTokens: (n: number) => void;
  setAssistantSystemPrompt: (p: string) => void;
  setTheme: (t: "dark" | "light") => void;
  hydrateSecure: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      provider: "lmstudio",
      baseUrl: "",
      apiKey: "",
      comfyUrl: "",
      model: "",
      maxTokens: 512,
      assistantSystemPrompt: "You are a helpful, concise assistant.",
      theme: "dark",

      // Switching provider pre-fills a suggested baseUrl ONLY when the user
      // hasn't customized one yet. The real URL is always the source of truth.
      setProvider: (p) => {
        const current = get().baseUrl;
        const isStillDefault =
          !current || Object.values(PROVIDER_DEFAULTS).includes(current);
        const next = isStillDefault ? PROVIDER_DEFAULTS[p] : current;
        set({ provider: p, baseUrl: next });
        writeSecure(next, get().apiKey, get().comfyUrl);
      },
      setBaseUrl: (url) => {
        set({ baseUrl: url });
        writeSecure(url, get().apiKey, get().comfyUrl);
      },
      setApiKey: (key) => {
        set({ apiKey: key });
        writeSecure(get().baseUrl, key, get().comfyUrl);
      },
      setComfyUrl: (url) => {
        set({ comfyUrl: url });
        writeSecure(get().baseUrl, get().apiKey, url);
      },
      setModel: (model) => set({ model }),
      setMaxTokens: (n) => set({ maxTokens: n }),
      setAssistantSystemPrompt: (p) => set({ assistantSystemPrompt: p }),
      setTheme: (t) => set({ theme: t }),

      // Call once on startup to pull the Keychain values into state.
      hydrateSecure: async () => {
        const s = await readSecure();
        set({ baseUrl: s.baseUrl, apiKey: s.apiKey, comfyUrl: s.comfyUrl });
      },
    }),
    {
      name: "caipy.settings",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the non-sensitive bits here; secrets come from SecureStore
      partialize: (s) => ({
        provider: s.provider,
        model: s.model,
        maxTokens: s.maxTokens,
        assistantSystemPrompt: s.assistantSystemPrompt,
        theme: s.theme,
      }),
    }
  )
);

export const defaultSettings: Settings = {
  provider: "lmstudio",
  baseUrl: PROVIDER_DEFAULTS.lmstudio,
  model: "",
  maxTokens: 512,
  assistantSystemPrompt: "You are a helpful, concise assistant.",
  comfyUrl: "",
  theme: "dark",
};
