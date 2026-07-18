import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Avatar } from "./Avatar";
import { TypingIndicator } from "./TypingIndicator";
import type { Message } from "@/types";
import type { Theme } from "@/theme/types";

interface MessageBubbleProps {
  message: Message;
  characterName: string;
  characterAvatar: string;
  theme: Theme;
  isLast: boolean;
}

export function MessageBubble({
  message,
  characterName,
  characterAvatar,
  theme,
  isLast,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isStreaming = message.streaming;
  const emptyAssistant = !isUser && isStreaming && !message.content;

  const handlePress = async () => {
    if (isStreaming) return;
    try {
      // Clipboard requires expo-clipboard; keep it dependency-light: toggle a
      // "copied" badge instead. Long-press handled by parent for regenerate.
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* noop */
    }
  };

  const onLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const showAvatar = !isUser;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        style={[
          styles.row,
          isUser ? styles.rowUser : styles.rowAssistant,
        ]}
      >
        {showAvatar && (
          <View style={styles.avatarCol}>
            <Avatar source={characterAvatar} size={32} theme={theme} />
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isUser
              ? {
                  backgroundColor: theme.bubbleUser,
                  borderBottomRightRadius: 4,
                }
              : {
                  backgroundColor: theme.bubbleAssistant,
                  borderBottomLeftRadius: 4,
                },
            message.error && { borderWidth: 1, borderColor: theme.danger },
          ]}
        >
          {!isUser && isLast && (
            <Text style={[styles.name, { color: theme.primary }]}>
              {characterName}
            </Text>
          )}

          {emptyAssistant ? (
            <TypingIndicator theme={theme} />
          ) : (
            <Text
              style={[
                styles.text,
                {
                  color: isUser ? theme.bubbleUserText : theme.bubbleAssistantText,
                },
                message.error && { color: theme.danger },
              ]}
            >
              {message.content}
              {isStreaming && <Text style={styles.cursor}>▋</Text>}
            </Text>
          )}

          {copied && (
            <View style={[styles.copiedBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.copiedText}>Copied</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "flex-end",
    gap: 8,
  },
  rowUser: { justifyContent: "flex-end" },
  rowAssistant: { justifyContent: "flex-start" },
  avatarCol: { marginBottom: 2 },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  name: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  cursor: {
    fontSize: 14,
    marginLeft: 1,
    opacity: 0.7,
  },
  copiedBadge: {
    position: "absolute",
    top: -10,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  copiedText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
