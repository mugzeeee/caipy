import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { Theme } from "@/theme/types";

interface AvatarProps {
  source: string; // emoji OR base64 data URI OR http(s) URL
  size?: number;
  theme: Theme;
  ring?: boolean;
}

export function Avatar({ source, size = 44, theme, ring }: AvatarProps) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  const isImage =
    source.startsWith("data:") ||
    /^https?:\/\//i.test(source);

  return (
    <View
      style={[
        styles.wrap,
        dim,
        {
          backgroundColor: theme.surfaceMuted,
          borderColor: ring ? theme.primary : "transparent",
        },
      ]}
    >
      {isImage ? (
        <Image source={{ uri: source }} style={dim} resizeMode="cover" />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{source || "🦊"}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
  },
});
