import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  SafeAreaView,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/Avatar";
import { useCharactersStore } from "@/store/characters";
import type { RootStackScreenProps } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

const AVATAR_CHOICES = [
  "🦊", "🤖", "🧙", "🐉", "🦉", "🐱", "👻", "👾",
  "🦄", "🌙", "📚", "🎵", "🔮", "💡", "🎭", "🧠",
];

export function CharacterEditorScreen({
  route,
  navigation,
}: RootStackScreenProps<"CharacterEditor">) {
  const theme = useTheme();
  const editingId = route.params?.characterId;
  const existing = useCharactersStore((s) =>
    editingId ? s.characters.find((c) => c.id === editingId) : undefined
  );
  const upsert = useCharactersStore((s) => s.upsert);
  const remove = useCharactersStore((s) => s.remove);

  const [name, setName] = useState(existing?.name ?? "");
  const [avatar, setAvatar] = useState(existing?.avatar ?? "🦊");
  const [greeting, setGreeting] = useState(existing?.greeting ?? "");
  const [opening, setOpening] = useState(existing?.openingMessage ?? "");
  const [systemPrompt, setSystemPrompt] = useState(existing?.systemPrompt ?? "");
  const [temperature, setTemperature] = useState(
    String(existing?.temperature ?? 0.8)
  );

  useEffect(() => {
    navigation.setOptions({ title: existing ? "Edit character" : "New character" });
  }, [existing, navigation]);

  const save = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Give your character a name.");
      return;
    }
    const tempNum = Math.min(2, Math.max(0, Number(temperature) || 0.8));
    upsert({
      id: editingId,
      name: name.trim(),
      avatar,
      greeting: greeting.trim() || "A custom character.",
      openingMessage: opening.trim() || `Hi! I'm ${name.trim()}.`,
      systemPrompt:
        systemPrompt.trim() ||
        `You are ${name.trim()}. Stay in character and be engaging.`,
      temperature: tempNum,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const del = () => {
    Alert.alert(
      "Delete character?",
      "This permanently removes the character and its chats.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (editingId) remove(editingId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar + name */}
        <View style={{ alignItems: "center", gap: 10 }}>
          <Avatar source={avatar} size={76} theme={theme} ring />
          <View style={styles.emojiRow}>
            {AVATAR_CHOICES.map((e) => (
              <Pressable
                key={e}
                onPress={() => {
                  setAvatar(e);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.emojiBtn,
                  {
                    backgroundColor:
                      avatar === e ? theme.primary : theme.surfaceMuted,
                  },
                ]}
              >
                <Text style={{ fontSize: 18 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Field label="Name" theme={theme}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Captain Byte"
            placeholderTextColor={theme.textDim}
            style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          />
        </Field>

        <Field label="Tagline" theme={theme}>
          <TextInput
            value={greeting}
            onChangeText={setGreeting}
            placeholder="A short one-liner shown on the card"
            placeholderTextColor={theme.textDim}
            style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          />
        </Field>

        <Field label="Opening message" theme={theme}>
          <TextInput
            value={opening}
            onChangeText={setOpening}
            placeholder="The first thing they say in a new chat"
            placeholderTextColor={theme.textDim}
            multiline
            style={[styles.inputMultiline, { color: theme.text, backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          />
        </Field>

        <Field label="Personality / system prompt" theme={theme}>
          <TextInput
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Describe how the character thinks, speaks, and behaves…"
            placeholderTextColor={theme.textDim}
            multiline
            style={[styles.inputMultiline, styles.inputTall, { color: theme.text, backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          />
        </Field>

        <Field label="Temperature (0–2)" theme={theme}>
          <TextInput
            value={temperature}
            onChangeText={setTemperature}
            keyboardType="decimal-pad"
            placeholder="0.8"
            placeholderTextColor={theme.textDim}
            style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          />
        </Field>

        {editingId && (
          <Pressable onPress={del} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[styles.deleteText, { color: theme.danger }]}>
              Delete character
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={[styles.saveBar, { backgroundColor: theme.bgElevated, borderTopColor: theme.border }]}>
        <Pressable
          onPress={save}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.saveBtnText}>Save character</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  theme,
  children,
}: {
  label: string;
  theme: ReturnType<typeof useTheme>;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", paddingHorizontal: 8 },
  emojiBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputMultiline: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 70,
    textAlignVertical: "top",
  },
  inputTall: { minHeight: 110 },
  deleteText: { textAlign: "center", fontSize: 15, fontWeight: "700", paddingVertical: 6 },
  saveBar: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1 },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
