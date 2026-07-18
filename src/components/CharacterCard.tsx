import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Avatar } from "./Avatar";
import type { Character } from "@/types";
import type { Theme } from "@/theme/types";

interface CharacterCardProps {
  character: Character;
  chatCount?: number;
  theme: Theme;
  onPress: () => void;
}

export function CharacterCard({
  character,
  chatCount = 0,
  theme,
  onPress,
}: CharacterCardProps) {
  const handle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable onPress={handle} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Avatar source={character.avatar} size={52} theme={theme} ring />
        <View style={styles.meta}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {character.name}
          </Text>
          <Text
            style={[styles.greeting, { color: theme.textMuted }]}
            numberOfLines={2}
          >
            {character.greeting}
          </Text>
          <Text style={[styles.count, { color: theme.textDim }]}>
            {chatCount > 0 ? `${chatCount} chats` : "Start chatting"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  meta: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: "700" },
  greeting: { fontSize: 13, lineHeight: 18 },
  count: { fontSize: 11, marginTop: 2 },
});
