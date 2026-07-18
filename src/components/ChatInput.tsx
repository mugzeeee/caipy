import React, { useRef } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import * as Haptics from "expo-haptics";
import type { Theme } from "@/theme/types";

interface ChatInputProps {
  theme: Theme;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  /** When true (assistant generating), tap the button to stop. */
  busy: boolean;
  onStop: () => void;
}

export function ChatInput({
  theme,
  value,
  onChange,
  onSend,
  busy,
  onStop,
}: ChatInputProps) {
  const inputRef = useRef<TextInput>(null);

  const canSend = value.trim().length > 0 && !busy;

  const handleSend = () => {
    if (busy) {
      onStop();
      return;
    }
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend();
  };

  return (
    <View style={[styles.bar, { backgroundColor: theme.bgElevated, borderTopColor: theme.border }]}>
      <View style={[styles.field, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder="Message…"
          placeholderTextColor={theme.textDim}
          multiline
          maxLength={4000}
          style={[styles.input, { color: theme.text }]}
          onSubmitEditing={() => {
            if (canSend) {
              handleSend();
              Keyboard.dismiss();
            }
          }}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend && !busy}
          style={[
            styles.sendBtn,
            {
              backgroundColor: busy ? theme.danger : canSend ? theme.primary : theme.surface,
              borderColor: theme.border,
            },
          ]}
          hitSlop={10}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <SendIcon color={canSend ? "#fff" : theme.textDim} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function SendIcon({ color }: { color: string }) {
  // Simple paper-plane-ish arrow. Keeping it as a Path avoids an icon dep.
  return (
    <View style={iconStyles.wrap}>
      <View style={[iconStyles.shaft, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  field: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlignVertical: "center",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});

const iconStyles = StyleSheet.create({
  wrap: { width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  shaft: { width: 3, height: 14, borderRadius: 2, transform: [{ rotate: "45deg" }] },
});
