import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  SafeAreaView,
  Alert,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSettingsStore } from "@/store/settings";
import { useImagesStore } from "@/store/images";
import { saveImageToDisk } from "@/store/images";
import {
  normalizeComfyUrl,
  listCheckpoints,
  listSamplers,
  listSchedulers,
  buildDefaultWorkflow,
  injectPrompt,
  queuePrompt,
  pollPrompt,
  fetchImageBytes,
  ComfyError,
} from "@/api/comfyui";
import { EmptyState } from "@/components/EmptyState";
import type { ImageScreenProps } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

const SCREEN_W = Dimensions.get("window").width;

type GenStatus = "idle" | "connecting" | "queued" | "generating" | "done" | "error";

export function ImageStudioScreen({
  navigation,
}: ImageScreenProps<"ImageStudio">) {
  const theme = useTheme();
  const comfyUrl = useSettingsStore((s) => s.comfyUrl);
  const setComfyUrl = useSettingsStore((s) => s.setComfyUrl);

  const images = useImagesStore((s) => s.images);
  const addImage = useImagesStore((s) => s.add);

  const [urlDraft, setUrlDraft] = useState(comfyUrl);
  const [simplePrompt, setSimplePrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [advancedJson, setAdvancedJson] = useState("");
  const [isAdvanced, setIsAdvanced] = useState(false);

  // Model / sampler / scheduler pickers (populated on connect)
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [samplers, setSamplers] = useState<string[]>([]);
  const [schedulers, setSchedulers] = useState<string[]>([]);

  const [selectedCkpt, setSelectedCkpt] = useState("");
  const [selectedSampler, setSelectedSampler] = useState("euler");
  const [selectedScheduler, setSelectedScheduler] = useState("normal");
  const [steps, setSteps] = useState("20");
  const [cfg, setCfg] = useState("7");
  const [width, setWidth] = useState("512");
  const [height, setHeight] = useState("512");

  const [status, setStatus] = useState<GenStatus>("idle");
  const [statusText, setStatusText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Hydrate URL from SecureStore on focus
  useFocusEffect(
    useCallback(() => {
      setUrlDraft(useSettingsStore.getState().comfyUrl);
    }, [])
  );

  const connect = async () => {
    const url = normalizeComfyUrl(urlDraft);
    if (!url) {
      Alert.alert("URL required", "Enter your ComfyUI server URL.");
      return;
    }
    setStatus("connecting");
    setStatusText("Connecting to ComfyUI…");
    setComfyUrl(url);
    try {
      const [ckpts, samps, scheds] = await Promise.all([
        listCheckpoints(url),
        listSamplers(url),
        listSchedulers(url),
      ]);
      setCheckpoints(ckpts);
      setSamplers(samps);
      setSchedulers(scheds);
      if (ckpts.length > 0 && !selectedCkpt) setSelectedCkpt(ckpts[0]);
      if (samps.length > 0 && !samplers.includes(selectedSampler))
        setSelectedSampler(samps[0]);
      if (scheds.length > 0 && !schedulers.includes(selectedScheduler))
        setSelectedScheduler(scheds[0]);
      setStatus("done");
      setStatusText(`✓ Connected — ${ckpts.length} checkpoint${ckpts.length !== 1 ? "s" : ""}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setStatus("error");
      setStatusText(e?.message ?? "Could not reach ComfyUI.");
    }
  };

  const generate = async () => {
    const url = normalizeComfyUrl(comfyUrl);
    if (!url) {
      Alert.alert("Not configured", "Set your ComfyUI server URL first.");
      return;
    }

    const promptText = isAdvanced
      ? simplePrompt // In advanced mode, {prompt} in JSON gets replaced
      : simplePrompt;
    if (!promptText.trim()) {
      Alert.alert("Prompt required", "Describe the image you want.");
      return;
    }

    setStatus("generating");
    setStatusText("Queuing workflow…");

    let workflow: Record<string, any>;
    try {
      if (isAdvanced) {
        const parsed = JSON.parse(advancedJson);
        workflow = injectPrompt(parsed, simplePrompt, negative);
      } else {
        workflow = buildDefaultWorkflow({
          prompt: simplePrompt,
          negative,
          ckpt: selectedCkpt,
          sampler: selectedSampler,
          scheduler: selectedScheduler,
          steps: Number(steps) || 20,
          cfg: Number(cfg) || 7,
          width: Number(width) || 512,
          height: Number(height) || 512,
        });
      }
    } catch {
      setStatus("error");
      setStatusText("Invalid workflow JSON in Advanced mode.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const promptId = await queuePrompt(url, workflow);
      setStatus("generating");
      setStatusText("Generating image…");

      const history = await pollPrompt(url, promptId, controller.signal, (v) => {
        setStatusText(`Generating image… ${v}%`);
      });

      // Extract the output image ref from SaveImage node (10)
      const outputNode = history.outputs?.["10"] ?? Object.values(history.outputs ?? {})[0];
      const imgRef = outputNode?.images?.[0];
      if (!imgRef) throw new ComfyError("No image in output.");

      setStatusText("Downloading image…");
      const blob = await fetchImageBytes(
        url,
        imgRef.filename,
        imgRef.subfolder,
        imgRef.type
      );

      // Convert blob to base64 and save to disk
      const reader = await blobToBase64(blob);
      const fileUri = await saveImageToDisk(reader);

      await addImage({
        prompt: simplePrompt,
        negative,
        params: {
          ckpt: selectedCkpt,
          sampler: selectedSampler,
          scheduler: selectedScheduler,
          steps: Number(steps) || 20,
          cfg: Number(cfg) || 7,
          width: Number(width) || 512,
          height: Number(height) || 512,
        },
        fileUri,
        source: isAdvanced ? "advanced" : "simple",
      });

      setStatus("done");
      setStatusText("✓ Image generated!");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setStatus("idle");
        setStatusText("Cancelled.");
        return;
      }
      setStatus("error");
      setStatusText(e?.message ?? "Generation failed.");
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  };

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.surfaceMuted, borderColor: theme.border },
  ];

  const colCount = 3;
  const imgGap = 4;
  const imgSize = (SCREEN_W - 32 - imgGap * (colCount - 1)) / colCount;

  const renderImage = useCallback(
    ({ item }: { item: any }) => (
      <Pressable
        onPress={() => navigation.navigate("ImageDetail", { imageId: item.id })}
        style={styles.imgCell}
      >
        <Image
          source={{ uri: item.fileUri }}
          style={[styles.imgThumb, { width: imgSize, height: imgSize }]}
          resizeMode="cover"
        />
      </Pressable>
    ),
    [imgSize, navigation]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Image Studio</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Generate images with ComfyUI
          </Text>
        </View>

        {/* Server URL */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>ComfyUI Server URL</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={urlDraft}
              onChangeText={setUrlDraft}
              placeholder="http://192.168.1.50:8188"
              placeholderTextColor={theme.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[inputStyle, { flex: 1 }]}
              onBlur={() => setComfyUrl(normalizeComfyUrl(urlDraft))}
            />
            <Pressable
              onPress={connect}
              disabled={status === "connecting"}
              style={[
                styles.connectBtn,
                { backgroundColor: theme.primary },
              ]}
            >
              <Text style={styles.connectBtnText}>
                {status === "connecting" ? "…" : "Connect"}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.hint, { color: theme.textDim }]}>
            ComfyUI must be running with --listen 0.0.0.0
          </Text>
        </View>

        {/* Status */}
        {statusText && (
          <View
            style={[
              styles.statusBox,
              {
                backgroundColor: theme.surfaceMuted,
                borderColor:
                  status === "done" ? theme.success : status === "error" ? theme.danger : theme.border,
              },
            ]}
          >
            <Text
              style={{
                color: status === "done" ? theme.success : status === "error" ? theme.danger : theme.text,
                fontSize: 13,
              }}
            >
              {statusText}
            </Text>
          </View>
        )}

        {/* Mode toggle */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["Simple", "Advanced"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setIsAdvanced(m === "Advanced")}
              style={[
                styles.modeBtn,
                {
                  flex: 1,
                  backgroundColor:
                    (m === "Advanced") === isAdvanced ? theme.primary : theme.surfaceMuted,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={{
                  color: (m === "Advanced") === isAdvanced ? "#fff" : theme.textMuted,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {m === "Advanced" ? "🔧 Advanced" : "✨ Simple"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Prompt */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            {isAdvanced ? "Prompt ({prompt} token)" : "Prompt"}
          </Text>
          <TextInput
            value={simplePrompt}
            onChangeText={setSimplePrompt}
            placeholder="A cat astronaut floating in space, digital art"
            placeholderTextColor={theme.textDim}
            multiline
            style={[styles.inputMultiline, inputStyle]}
          />
        </View>

        {/* Negative */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            {isAdvanced ? "Negative ({negative} token)" : "Negative prompt"}
          </Text>
          <TextInput
            value={negative}
            onChangeText={setNegative}
            placeholder="blurry, low quality, distorted"
            placeholderTextColor={theme.textDim}
            multiline
            style={[styles.inputMultiline, inputStyle]}
          />
        </View>

        {/* Advanced JSON */}
        {isAdvanced && (
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: theme.textMuted }]}>
              Workflow JSON (API format)
            </Text>
            <TextInput
              value={advancedJson}
              onChangeText={setAdvancedJson}
              placeholder='Paste your ComfyUI API workflow JSON here. Use {"{prompt}"} and {"{negative}"} as placeholders.'
              placeholderTextColor={theme.textDim}
              multiline
              style={[styles.inputTall, inputStyle]}
            />
          </View>
        )}

        {/* Simple-mode pickers */}
        {!isAdvanced && checkpoints.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Checkpoint</Text>
            <View style={styles.chipRow}>
              {checkpoints.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setSelectedCkpt(c)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedCkpt === c ? theme.primary : theme.surfaceMuted,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={{ color: selectedCkpt === c ? "#fff" : theme.text, fontSize: 11, fontWeight: "600" }}
                    numberOfLines={1}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {!isAdvanced && samplers.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Sampler</Text>
            <View style={styles.chipRow}>
              {samplers.slice(0, 8).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSelectedSampler(s)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedSampler === s ? theme.primary : theme.surfaceMuted,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={{ color: selectedSampler === s ? "#fff" : theme.text, fontSize: 11, fontWeight: "600" }}
                    numberOfLines={1}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Params grid */}
        {!isAdvanced && (
          <View style={styles.paramsGrid}>
            {[
              { label: "Steps", val: steps, set: setSteps },
              { label: "CFG", val: cfg, set: setCfg },
              { label: "W", val: width, set: setWidth },
              { label: "H", val: height, set: setHeight },
            ].map(({ label, val, set }) => (
              <View key={label} style={{ gap: 4 }}>
                <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
                <TextInput
                  value={val}
                  onChangeText={set}
                  keyboardType="decimal-pad"
                  style={[inputStyle, { textAlign: "center", fontSize: 14 }]}
                />
              </View>
            ))}
          </View>
        )}

        {/* Generate / Cancel */}
        {status === "generating" ? (
          <Pressable onPress={cancel} style={styles.cancelBtn}>
            <LinearGradient
              colors={[theme.danger, "#b91c1c"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientFill}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable onPress={generate} disabled={status === "connecting"}>
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientFill}
            >
              <Text style={styles.btnText}>✨ Generate</Text>
            </LinearGradient>
          </Pressable>
        )}

        {/* Gallery */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Generated ({images.length})
          </Text>
          {images.length === 0 ? (
            <EmptyState
              theme={theme}
              emoji="🖼️"
              title="No images yet"
              subtitle="Generate your first image above."
            />
          ) : (
            <View style={styles.galleryGrid}>
              {images.map((img) => (
                <Pressable
                  key={img.id}
                  onPress={() => navigation.navigate("ImageDetail", { imageId: img.id })}
                >
                  <Image
                    source={{ uri: img.fileUri }}
                    style={{ width: imgSize, height: imgSize, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // data:image/png;base64,XXXX → extract XXXX
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  hint: { fontSize: 11 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  inputTall: {
    minHeight: 130,
    textAlignVertical: "top",
    fontFamily: "monospace",
    fontSize: 12,
  },
  connectBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  connectBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  statusBox: { borderWidth: 1, borderRadius: 12, padding: 12 },
  modeBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "45%",
  },
  paramsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gradientFill: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cancelBtn: { borderRadius: 14, overflow: "hidden" },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  imgCell: { borderRadius: 10, overflow: "hidden" },
  imgThumb: { borderRadius: 10 },
});
