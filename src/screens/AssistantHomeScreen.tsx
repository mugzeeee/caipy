import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  SafeAreaView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useChatsStore } from "@/store/chats";
import { useSettingsStore } from "@/store/settings";
import type { AssistantScreenProps } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";
import { GradientButton } from "@/components/GradientButton";
import { SkeletonChatRow } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";

export function AssistantHomeScreen({
  navigation,
}: AssistantScreenProps<"AssistantHome">) {
  const theme = useTheme();
  const assistantChats = useChatsStore((s) => s.getAssistantChats());
  const deleteChat = useChatsStore((s) => s.deleteChat);
  const createAssistantChat = useChatsStore((s) => s.createAssistantChat);
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => setReady(true), 50);
      return () => clearTimeout(t);
    }, [])
  );

  const openOrCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = createAssistantChat();
    navigation.navigate("AssistantChat", { chatId: id });
  };

  const openChat = (chatId: string) => {
    navigation.navigate("AssistantChat", { chatId });
  };

  const swipeDelete = (chatId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteChat(chatId);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Assistant</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
            Plain AI chat — no character persona
          </Text>
        </View>
      </View>

      {ready ? (
        <FlatList
          data={assistantChats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          maxToRenderPerBatch={8}
          windowSize={6}
          removeClippedSubviews
          ListHeaderComponent={
            <GradientButton
              theme={theme}
              icon="💬"
              label="New chat"
              onPress={openOrCreate}
              style={{ marginBottom: 8 }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              theme={theme}
              emoji="🤖"
              title="No conversations yet"
              subtitle="Tap New chat to start a plain AI conversation."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openChat(item.id)}
              onLongPress={() => swipeDelete(item.id)}
              style={({ pressed }) => [
                styles.chatRow,
                {
                  backgroundColor: pressed ? theme.cardHighlight : theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.chatTitle, { color: theme.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.chatPreview, { color: theme.textMuted }]} numberOfLines={2}>
                {item.messages[item.messages.length - 1]?.content ?? "Empty"}
              </Text>
              <Text style={[styles.chatMeta, { color: theme.textDim }]}>
                {item.messages.length} messages · {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <View style={styles.loading}>
          <SkeletonChatRow theme={theme} />
          <SkeletonChatRow theme={theme} />
          <SkeletonChatRow theme={theme} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  loading: { padding: 16, gap: 10 },
  chatRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  chatTitle: { fontSize: 16, fontWeight: "700" },
  chatPreview: { fontSize: 13, lineHeight: 18 },
  chatMeta: { fontSize: 11, marginTop: 4 },
});
