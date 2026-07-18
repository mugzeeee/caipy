import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Theme } from "@/theme/types";

interface EmptyStateProps {
  theme: Theme;
  emoji: string;
  title: string;
  subtitle: string;
}

/**
 * Consistent empty-state placeholder used across all tabs.
 * Shows a large emoji + title + subtitle centred on screen.
 */
export function EmptyState({ theme, emoji, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
