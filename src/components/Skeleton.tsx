import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import type { Theme } from "@/theme/types";

/**
 * Shimmer skeleton placeholder — used for lists while content hydrates from
 * AsyncStorage on first focus. Replaces spinners with a less jarring loading
 * indicator.
 */

interface SkeletonRectProps {
  theme: Theme;
  width: number | string;
  height: number;
  radius?: number;
}

function SkeletonRect({ theme, width, height, radius = 12 }: SkeletonRectProps) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [offset]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + offset.value * 0.15,
  }));

  return (
    <Animated.View
      style={[
        {
          width: typeof width === "string" ? `${width}` : width,
          height,
          borderRadius: radius,
          backgroundColor: theme.textMuted,
        } as any,
        animStyle,
      ]}
    />
  );
}

/** Pre-built skeleton row that mimics a CharacterCard. */
export function SkeletonCard({ theme }: { theme: Theme }) {
  return (
    <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 14 }]}>
      <SkeletonRect theme={theme} width={52} height={52} radius={26} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonRect theme={theme} width="70%" height={16} />
        <SkeletonRect theme={theme} width="90%" height={12} />
        <SkeletonRect theme={theme} width={60} height={10} />
      </View>
    </View>
  );
}

/** Pre-built skeleton for a chat list row. */
export function SkeletonChatRow({ theme }: { theme: Theme }) {
  return (
    <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 }]}>
      <SkeletonRect theme={theme} width="60%" height={16} />
      <SkeletonRect theme={theme} width="95%" height={12} />
      <SkeletonRect theme={theme} width="80%" height={12} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: 8 },
});
