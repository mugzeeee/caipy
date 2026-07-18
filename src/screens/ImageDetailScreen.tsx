import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  SafeAreaView,
  Alert,
  Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useImagesStore } from "@/store/images";
import type { ImageScreenProps } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

const SCREEN_W = Dimensions.get("window").width;

export function ImageDetailScreen({
  route,
}: ImageScreenProps<"ImageDetail">) {
  const theme = useTheme();
  const { imageId } = route.params;
  const image = useImagesStore((s) => s.images.find((i) => i.id === imageId));
  const removeImage = useImagesStore((s) => s.remove);

  if (!image) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.textMuted }}>Image not found.</Text>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert("Delete image?", "This removes the image permanently.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          removeImage(imageId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const paramEntries = Object.entries(image.params);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Full image */}
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: image.fileUri }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>

        {/* Info */}
        <View style={{ padding: 16, gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Prompt</Text>
            <Text style={[styles.promptText, { color: theme.text }]}>{image.prompt}</Text>
          </View>

          {image.negative ? (
            <View style={{ gap: 6 }}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Negative</Text>
              <Text style={[styles.promptText, { color: theme.text }]}>{image.negative}</Text>
            </View>
          ) : null}

          {paramEntries.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Parameters</Text>
              <View style={styles.paramsGrid}>
                {paramEntries.map(([k, v]) => (
                  <View key={k} style={[styles.paramChip, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                    <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>{k}</Text>
                    <Text style={{ color: theme.text, fontSize: 12 }}>{String(v)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text style={[styles.dateText, { color: theme.textDim }]}>
            {new Date(image.createdAt).toLocaleString()} · {image.source}
          </Text>

          <Pressable onPress={handleDelete} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[styles.deleteText, { color: theme.danger }]}>Delete image</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageWrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    minHeight: 300,
  },
  fullImage: {
    width: SCREEN_W,
    height: SCREEN_W,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  promptText: {
    fontSize: 15,
    lineHeight: 21,
  },
  paramsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paramChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  dateText: { fontSize: 12 },
  deleteText: { textAlign: "center", fontSize: 15, fontWeight: "700", paddingVertical: 8 },
});
