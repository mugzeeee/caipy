import React, { useEffect, useRef, useState, useCallback } from "react";
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
import type { ListRenderItem } from "react-native";
import { MessageBubble } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { useChatsStore } from "@/store/chats";
import { useSettingsStore } from "@/store/settings";
import { useChatEngine } from "@/hooks/useChatEngine";
import type { Message } from "@/types";
import type { AssistantScreenProps } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

export function AssistantChatScreen({
  route,
  navigation,
}: AssistantScreenProps<"AssistantChat">) {
  const theme = useTheme();
  const { chatId } = route.params;

  // We subscribe narrowly to just the messages array for this chat.
  const messages: Message[] =
    useChatsStore((s) => s.chats.find((c) => c.id === chatId)?.messages) ?? [];

  const assistantSystemPrompt = useSettingsStore((s) => s.assistantSystemPrompt);
  const { generating, send, stop, regenerate, sendDisabled } = useChatEngine({
    chatId,
    systemPrompt: assistantSystemPrompt,
    temperature: 0.7,
  });

  const [input, setInput] = useState("");

  useEffect(() => {
    if (chatId) {
      const chat = useChatsStore.getState().chats.find((c) => c.id === chatId);
      navigation.setOptions({ title: chat?.title ?? "Assistant" });
    }
  }, [chatId, navigation]);

  const listRef = useRef<FlatList<Message>>(null);

  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || generating) return;
    setInput("");
    send(text);
    scrollToBottom();
  };

  const handleRegenerate = () => {
    if (generating) return;
    regenerate(messages);
  };

  const handleStop = () => {
    stop();
  };

  // Memoized renderItem — key perf win for long conversations.
  const renderItem: ListRenderItem<Message> = useCallback(
    ({ item, index }) => (
      <MessageBubble
        message={item}
        characterName="Assistant"
        characterAvatar="🤖"
        theme={theme}
        isLast={index === messages.length - 1}
      />
    ),
    [messages.length, theme]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Sub-header */}
      <View
        style={[
          styles.subHeader,
          { borderBottomColor: theme.border, backgroundColor: theme.bgElevated },
        ]}
      >
        <Text style={[styles.subIcon]}>🤖</Text>
        <Text style={[styles.subName, { color: theme.text }]} numberOfLines={1}>
          Assistant
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
        maxToRenderPerBatch={10}
        windowSize={8}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: "center", padding: 20 }}>
              Say something to start the conversation…
            </Text>
          </View>
        }
      />

      {sendDisabled && (
        <View style={[styles.banner, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.bannerText, { color: theme.textMuted }]}>
            ⚠️ Set your server URL and pick a model in Settings to start chatting.
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
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  subIcon: { fontSize: 20 },
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
