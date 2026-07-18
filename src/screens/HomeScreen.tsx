import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { CharacterCard } from "@/components/CharacterCard";
import { Avatar } from "@/components/Avatar";
import { useCharactersStore } from "@/store/characters";
import { useChatsStore } from "@/store/chats";
import { useSettingsStore } from "@/store/settings";
import type { RootStackScreenProps } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

export function HomeScreen({ navigation }: RootStackScreenProps<"Home">) {
  const theme = useTheme();
  const characters = useCharactersStore((s) => s.characters);
  const upsertCharacter = useCharactersStore((s) => s.upsert);
  const chats = useChatsStore((s) => s.chats);
  const baseUrl = useSettingsStore((s) => s.baseUrl);
  const [ready, setReady] = useState(false);

  // AsyncStorage persist hydrates asynchronously; flip the spinner off once we
  // have data on first focus.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => setReady(true), 50);
      return () => clearTimeout(t);
    }, [])
  );

  const chatCountFor = (characterId: string) =>
    chats.filter((c) => c.characterId === characterId).length;

  const openCharacter = (characterId: string) => {
    navigation.navigate("Chat", { characterId });
  };

  const createCharacter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("CharacterEditor", {});
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Caipy</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {baseUrl ? "Your local AIs" : "Add a server in Settings →"}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          hitSlop={12}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Avatar source="⚙️" size={38} theme={theme} />
        </Pressable>
      </View>

      {ready ? (
        <FlatList
          data={characters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          ListHeaderComponent={
            <Pressable
              onPress={createCharacter}
              style={({ pressed }) => [
                styles.createTile,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.createIcon, { backgroundColor: theme.primary }]}>
                <Text style={styles.createPlus}>+</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.createTitle, { color: theme.text }]}>
                  Create a character
                </Text>
                <Text style={[styles.createSub, { color: theme.textMuted }]}>
                  Give it a name, look, and personality
                </Text>
              </View>
            </Pressable>
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: theme.textMuted }}>No characters yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CharacterCard
              character={item}
              chatCount={chatCountFor(item.id)}
              theme={theme}
              onPress={() => openCharacter(item.id)}
            />
          )}
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  createTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginBottom: 4,
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  createPlus: { color: "#fff", fontSize: 26, fontWeight: "800", marginTop: -2 },
  createTitle: { fontSize: 16, fontWeight: "700" },
  createSub: { fontSize: 12, marginTop: 2 },
});
