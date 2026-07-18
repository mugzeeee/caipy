import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import type { ListRenderItem } from "react-native";
import { Avatar } from "@/components/Avatar";
import { MessageBubble } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { useCharactersStore } from "@/store/characters";
import {
  useChatsStore,
  makeMessage,
} from "@/store/chats";
import { useSettingsStore } from "@/store/settings";
import { streamChat, LMStudioError } from "@/api/lmstudio";
import type { Message } from "@/types";
import type { RootStackScreenProps } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

export function ChatScreen({ route, navigation }: RootStackScreenProps<"Chat">) {
  const theme = useTheme();
  const { characterId } = route.params;

  const character = useCharactersStore((s) =>
    s.characters.find((c) => c.id === characterId)
  );
  const ensureChat = useChatsStore((s) => s.ensureChat);
  const appendMessage = useChatsStore((s) => s.appendMessage);
  const updateMessage = useChatsStore((s) => s.updateMessage);
  const removeMessagesFrom = useChatsStore((s) => s.removeMessagesFrom);
  const chatFromStore = useChatsStore((s) =>
    s.chats.find((c) => c.characterId === characterId)
  );

  const baseUrl = useSettingsStore((s) => s.baseUrl);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const model = useSettingsStore((s) => s.model);
  const maxTokens = useSettingsStore((s) => s.maxTokens);

  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Bootstrap: create a chat (with the character's opening line) if none exists.
  useEffect(() => {
    if (!character) return;
    const existing = useChatsStore.getState().chats.find(
      (c) => c.characterId === characterId
    );
    if (!existing) {
      const opening = makeMessage("assistant", character.openingMessage);
      ensureChat(characterId, opening);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  // Header title
  useEffect(() => {
    if (character) {
      navigation.setOptions({ title: character.name });
    }
  }, [character, navigation]);

  const messages: Message[] = chatFromStore?.messages ?? [];

  const listRef = useRef<FlatList<Message>>(null);

  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  };

  const sendDisabled = !baseUrl || !model;

  const buildApiMessages = (history: Message[]) => {
    const sys = {
      role: "system" as const,
      content: character?.systemPrompt ?? "You are a helpful assistant.",
    };
    // Trim to last ~16 turns to keep tokens sane.
    const trimmed = history.slice(-32).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    return [sys, ...trimmed.filter((m) => m.role !== "system")];
  };

  const runGeneration = async (history: Message[]) => {
    if (!character) return;
    if (sendDisabled) {
      Alert.alert(
        "Not configured",
        "Set your LM Studio server URL and pick a model in Settings first."
      );
      return;
    }

    // Append a placeholder assistant message we'll mutate as tokens arrive.
    const placeholder = makeMessage("assistant", "", { streaming: true });
    appendMessage(chatFromStore!.id, placeholder);
    setGenerating(true);
    scrollToBottom();

    const controller = new AbortController();
    abortRef.current = controller;

    let buffered = "";
    let firstToken = true;

    await streamChat({
      baseUrl,
      apiKey,
      model,
      messages: buildApiMessages(history),
      temperature: character.temperature,
      maxTokens,
      signal: controller.signal,
      onToken: (_delta, full) => {
        buffered = full;
        if (firstToken) {
          firstToken = false;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        updateMessage(chatFromStore!.id, placeholder.id, {
          content: full,
          streaming: true,
        });
        scrollToBottom();
      },
      onDone: (full) => {
        updateMessage(chatFromStore!.id, placeholder.id, {
          content: full || "_(no response)_",
          streaming: false,
        });
        setGenerating(false);
        abortRef.current = null;
      },
      onError: (err, partial) => {
        const msg =
          err instanceof LMStudioError && err.status
            ? err.message
            : "Couldn't reach LM Studio. Check it's running, on the same Wi-Fi, and that 'Serve on Local Network' is on.";
        updateMessage(chatFromStore!.id, placeholder.id, {
          content: partial || msg,
          streaming: false,
          error: !partial,
        });
        setGenerating(false);
        abortRef.current = null;
      },
    });
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || generating) return;
    setInput("");

    const userMsg = makeMessage("user", text);
    appendMessage(chatFromStore!.id, userMsg);
    scrollToBottom();

    // Build history from the freshest store state (after the append above).
    const fresh = useChatsStore
      .getState()
      .chats.find((c) => c.id === chatFromStore!.id)?.messages ?? [];
    runGeneration(fresh);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setGenerating(false);
    // The streaming placeholder will be left as-is; mark it not streaming.
    const last = messages[messages.length - 1];
    if (last?.streaming) {
      updateMessage(chatFromStore!.id, last.id, { streaming: false });
    }
  };

  const handleRegenerate = () => {
    if (generating) return;
    // Drop the last assistant message, then re-run from the prior user turn.
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    removeMessagesFrom(chatFromStore!.id, last.id);
    const fresh = useChatsStore
      .getState()
      .chats.find((c) => c.id === chatFromStore!.id)?.messages ?? [];
    runGeneration(fresh);
  };

  const renderItem: ListRenderItem<Message> = ({ item, index }) => (
    <MessageBubble
      message={item}
      characterName={character?.name ?? "Assistant"}
      characterAvatar={character?.avatar ?? "🤖"}
      theme={theme}
      isLast={index === messages.length - 1}
    />
  );

  if (!character) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.textMuted }}>Character not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Sub-header: character avatar + regenerate */}
      <View style={[styles.subHeader, { borderBottomColor: theme.border, backgroundColor: theme.bgElevated }]}>
        <Avatar source={character.avatar} size={28} theme={theme} />
        <Text style={[styles.subName, { color: theme.text }]} numberOfLines={1}>
          {character.name}
        </Text>
        <Pressable
          onPress={handleRegenerate}
          disabled={generating || messages.length === 0}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          hitSlop={10}
        >
          <Text
            style={[
              styles.regen,
              { color: generating ? theme.textDim : theme.primary },
            ]}
          >
            ↻ Regenerate
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 24 }}
        onContentSizeChange={() => scrollToBottom(false)}
        onLayout={() => scrollToBottom(false)}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ActivityIndicator color={theme.primary} />
          </View>
        }
      />

      {sendDisabled && (
        <View style={[styles.banner, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.bannerText, { color: theme.textMuted }]}>
            ⚠️ Set your LM Studio server URL and model in Settings to start chatting.
          </Text>
        </View>
      )}

      <ChatInput
        theme={theme}
        value={input}
        onChange={setInput}
        onSend={handleSend}
        busy={generating}
        onStop={handleStop}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  subName: { flex: 1, fontSize: 15, fontWeight: "700" },
  regen: { fontSize: 13, fontWeight: "700" },
  empty: { padding: 40, alignItems: "center" },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
  },
  bannerText: { fontSize: 12, textAlign: "center" },
});
