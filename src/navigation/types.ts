import type { NativeStackScreenProps } from "@react-navigation/native-stack";

// ── Bottom-tab param list ────────────────────────────────────────────

export type BottomTabParamList = {
  CharactersTab: undefined;
  AssistantTab: undefined;
  ImageTab: undefined;
  SettingsTab: undefined;
};

export type BottomTabScreenProps<T extends keyof BottomTabParamList> =
  NativeStackScreenProps<BottomTabParamList, T>;

// ── Per-tab native-stack param lists ─────────────────────────────────

export type CharactersStackParamList = {
  Home: undefined;
  Chat: { characterId: string; chatId?: string };
  CharacterEditor: { characterId?: string };
};

export type AssistantStackParamList = {
  AssistantHome: undefined;
  AssistantChat: { chatId: string };
};

export type ImageStackParamList = {
  ImageStudio: undefined;
  ImageDetail: { imageId: string };
};

// Convenience aliases used by individual screens.
export type RootStackScreenProps<T extends keyof CharactersStackParamList> =
  NativeStackScreenProps<CharactersStackParamList, T>;

export type AssistantScreenProps<T extends keyof AssistantStackParamList> =
  NativeStackScreenProps<AssistantStackParamList, T>;

export type ImageScreenProps<T extends keyof ImageStackParamList> =
  NativeStackScreenProps<ImageStackParamList, T>;

// ── Global route augmentation ────────────────────────────────────────

declare module "@react-navigation/native" {
  interface RootParamList extends BottomTabParamList {}
}
