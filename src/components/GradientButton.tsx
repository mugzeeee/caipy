import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import type { Theme } from "@/theme/types";

/**
 * Primary call-to-action button: gradient fill + reanimated press scale.
 * Replaces the flat-Pressable primary buttons across the app for a consistent,
 * tactile feel.
 */
interface GradientButtonProps {
  theme: Theme;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Optional leading glyph (emoji or short text). */
  icon?: string;
  style?: ViewStyle;
}

const APressable = Animated.createAnimatedComponent(Pressable);

export function GradientButton({
  theme,
  label,
  onPress,
  disabled,
  loading,
  icon,
  style,
}: GradientButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(scale.value, { duration: 120, easing: Easing.out(Easing.ease) }) }],
  }));

  return (
    <APressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => (scale.value = 0.97)}
      onPressOut={() => (scale.value = 1)}
      style={[styles.wrap, animStyle, { opacity: disabled ? 0.5 : 1 }, style]}
    >
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      >
        <Text style={styles.label}>
          {icon ? `${icon}  ` : ""}
          {loading ? "…" : label}
        </Text>
      </LinearGradient>
    </APressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: "hidden" },
  fill: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
});
