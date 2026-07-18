import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Home: undefined;
  Chat: { characterId: string; chatId?: string };
  CharacterEditor: { characterId?: string };
  Settings: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare module "@react-navigation/native" {
  interface RootParamList extends RootStackParamList {}
}
