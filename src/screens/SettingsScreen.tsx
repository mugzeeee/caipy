import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSettingsStore } from "@/store/settings";
import { listModels, normalizeBaseUrl, ApiError, type ModelInfo } from "@/api/chat";
import { useTheme } from "@/theme/useTheme";
import type { Provider } from "@/types";

const PROVIDER_LABELS: Record<Provider, { label: string; hint: string }> = {
  lmstudio: { label: "LM Studio", hint: "http://<ip>:1234/v1" },
  ollama: { label: "Ollama", hint: "http://<ip>:11434/v1" },
  custom: { label: "Custom", hint: "Any OpenAI-compatible /v1 endpoint" },
};

export function SettingsScreen() {
  const theme = useTheme();
  const {
    provider, baseUrl, apiKey, model, maxTokens, assistantSystemPrompt, comfyUrl, theme: themePref,
    setProvider, setBaseUrl, setApiKey, setModel, setMaxTokens, setAssistantSystemPrompt, setComfyUrl, setTheme,
  } = useSettingsStore();

  const [urlDraft, setUrlDraft] = useState(baseUrl);
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [comfyDraft, setComfyDraft] = useState(comfyUrl);
  const [testing, setTesting] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState<boolean | null>(null);
  const [promptDraft, setPromptDraft] = useState(assistantSystemPrompt);

  const testConnection = async () => {
    setTesting(true);
    setStatusText(null);
    setStatusOk(null);
    setModels([]);
    try {
      const url = normalizeBaseUrl(urlDraft);
      setBaseUrl(url);
      setApiKey(keyDraft);
      const found = await listModels(url, keyDraft);
      setModels(found);
      if (found.length === 0) {
        setStatusText("Connected, but no models found. Check your server.");
        setStatusOk(false);
      } else {
        setStatusText(`Connected — ${found.length} model${found.length > 1 ? "s" : ""}.`);
        setStatusOk(true);
        if (!model && found.length > 0) setModel(found[0].id);
      }
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError
          ? e.message
          : "Network error. Confirm your server is running and reachable from your phone.";
      setStatusText(msg);
      setStatusOk(false);
    } finally {
      setTesting(false);
    }
  };

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.surfaceMuted, borderColor: theme.border },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>

        {/* ── Provider ────────────────────────────────────────── */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Provider</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["lmstudio", "ollama", "custom"] as Provider[]).map((p) => (
              <Pressable
                key={p}
                onPress={() => {
                  setProvider(p);
                  setUrlDraft(useSettingsStore.getState().baseUrl);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.providerBtn,
                  {
                    backgroundColor: provider === p ? theme.primary : theme.surfaceMuted,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: provider === p ? "#fff" : theme.textMuted,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  {PROVIDER_LABELS[p].label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Server URL ──────────────────────────────────────── */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Server URL</Text>
          <TextInput
            value={urlDraft}
            onChangeText={setUrlDraft}
            placeholder={PROVIDER_LABELS[provider].hint}
            placeholderTextColor={theme.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={inputStyle}
            onBlur={() => setBaseUrl(normalizeBaseUrl(urlDraft))}
          />
        </View>

        {/* ── API key ─────────────────────────────────────────── */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>API key (optional)</Text>
          <TextInput
            value={keyDraft}
            onChangeText={setKeyDraft}
            placeholder={provider === "ollama" ? "ollama" : "leave blank if none"}
            placeholderTextColor={theme.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={inputStyle}
          />
        </View>

        {/* ── Test connection ─────────────────────────────────── */}
        <Pressable
          onPress={testConnection}
          disabled={testing}
          style={({ pressed }) => [
            styles.testBtn,
            { backgroundColor: theme.primary, opacity: pressed || testing ? 0.8 : 1 },
          ]}
        >
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.testBtnText}>Test connection</Text>
          )}
        </Pressable>

        {statusText && (
          <View
            style={[
              styles.status,
              {
                backgroundColor: theme.surfaceMuted,
                borderColor: statusOk ? theme.success : theme.danger,
              },
            ]}
          >
            <Text style={{ color: statusOk ? theme.success : theme.danger, fontSize: 13 }}>
              {statusText}
            </Text>
          </View>
        )}

        {/* ── Model picker ────────────────────────────────────── */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Model</Text>
          {models.length > 0 ? (
            <View style={styles.modelList}>
              {models.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    setModel(m.id);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.modelRow,
                    {
                      backgroundColor:
                        model === m.id ? theme.primary : theme.surfaceMuted,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: model === m.id ? "#fff" : theme.text,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                    numberOfLines={1}
                  >
                    {m.id}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <TextInput
              value={model}
              onChangeText={setModel}
              placeholder="Tap Test connection to load, or type a model id"
              placeholderTextColor={theme.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />
          )}
        </View>

        {/* ── Max tokens ──────────────────────────────────────── */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            Max response tokens: {maxTokens}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[128, 256, 512, 1024].map((n) => (
              <Pressable
                key={n}
                onPress={() => setMaxTokens(n)}
                style={[
                  styles.maxBtn,
                  {
                    backgroundColor:
                      maxTokens === n ? theme.primary : theme.surfaceMuted,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: maxTokens === n ? "#fff" : theme.textMuted,
                    fontWeight: "700",
                  }}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Assistant system prompt ─────────────────────────── */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Assistant system prompt</Text>
          <TextInput
            value={promptDraft}
            onChangeText={setPromptDraft}
            onBlur={() => setAssistantSystemPrompt(promptDraft)}
            placeholder="You are a helpful, concise assistant."
            placeholderTextColor={theme.textDim}
            multiline
            style={[styles.inputMultiline, inputStyle]}
          />
        </View>

        {/* ── ComfyUI URL ─────────────────────────────────────── */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>ComfyUI server URL</Text>
          <TextInput
            value={comfyDraft}
            onChangeText={setComfyDraft}
            placeholder="http://192.168.1.50:8188"
            placeholderTextColor={theme.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={inputStyle}
            onBlur={() => setComfyUrl(comfyDraft.trim())}
          />
          <Text style={[styles.hint, { color: theme.textDim }]}>
            ComfyUI must run with --listen 0.0.0.0
          </Text>
        </View>

        {/* ── Theme ───────────────────────────────────────────── */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Theme</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["dark", "light"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTheme(t)}
                style={[
                  styles.maxBtn,
                  { flex: 1, backgroundColor: themePref === t ? theme.primary : theme.surfaceMuted, borderColor: theme.border },
                ]}
              >
                <Text style={{ color: themePref === t ? "#fff" : theme.textMuted, fontWeight: "700" }}>
                  {t === "dark" ? "Dark" : "Light"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Help box ────────────────────────────────────────── */}
        <View style={[styles.helpBox, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.helpTitle, { color: theme.text }]}>
            Quick setup
          </Text>
          <Text style={[styles.helpText, { color: theme.textMuted }]}>
            {provider === "lmstudio"
              ? "In LM Studio: Developer tab → Start server on 1234 → Toggle 'Serve on Local Network'."
              : provider === "ollama"
                ? "Run: OLLAMA_ORIGINS=* ollama serve. The app talks to port 11434."
                : "Point this at any OpenAI-compatible /v1 endpoint."}
            {"\n\n"}
            Make sure your phone and server are on the same Wi-Fi.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
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
  providerBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  testBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  testBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  status: { borderWidth: 1, borderRadius: 12, padding: 12 },
  modelList: { gap: 8 },
  modelRow: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  maxBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  helpBox: { borderRadius: 14, padding: 14, gap: 6 },
  helpTitle: { fontSize: 14, fontWeight: "800" },
  helpText: { fontSize: 13, lineHeight: 19 },
});
