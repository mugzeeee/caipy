import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import type { Theme } from "@/theme/types";

interface TypingIndicatorProps {
  theme: Theme;
  color?: string;
}

export function TypingIndicator({ theme, color }: TypingIndicatorProps) {
  const dotColor = color ?? theme.textMuted;

  const Dot = ({ index }: { index: number }) => {
    const y = useSharedValue(0);
    useEffect(() => {
      y.value = withDelay(
        index * 160,
        withRepeat(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          -1,
          true // reverse on each iteration
        )
      );
    }, [index]);

    const style = useAnimatedStyle(() => ({
      transform: [
        {
          translateY: interpolate(y.value, [0, 1], [0, -4]),
        },
      ],
      opacity: interpolate(y.value, [0, 1], [0.4, 1]),
    }));

    return (
      <Animated.View
        style={[styles.dot, { backgroundColor: dotColor }, style]}
      />
    );
  };

  return (
    <View style={styles.row}>
      <Dot index={0} />
      <Dot index={1} />
      <Dot index={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
