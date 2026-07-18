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
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSettingsStore } from "@/store/settings";
import { listModels, normalizeBaseUrl, LMStudioError, type ModelInfo } from "@/api/lmstudio";
import { useTheme } from "@/theme/useTheme";

export function SettingsScreen() {
  const theme = useTheme();
  const {
    baseUrl, apiKey, model, maxTokens, theme: themePref,
    setBaseUrl, setApiKey, setModel, setMaxTokens, setTheme,
  } = useSettingsStore();

  const [urlDraft, setUrlDraft] = useState(baseUrl);
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [testing, setTesting] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState<boolean | null>(null);

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
        setStatusText("Connected, but no models loaded in LM Studio.");
        setStatusOk(false);
      } else {
        setStatusText(`✓ Connected — ${found.length} model${found.length > 1 ? "s" : ""}.`);
        setStatusOk(true);
        if (!model && found.length > 0) setModel(found[0].id);
      }
    } catch (e) {
      const msg =
        e instanceof LMStudioError
          ? e.message
          : "Network error. Confirm LM Studio is running, on the same Wi-Fi, with 'Serve on Local Network' on.";
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
        <Text style={[styles.sectionTitle, { color: theme.text }]}>LM Studio</Text>

        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Server URL</Text>
          <TextInput
            value={urlDraft}
            onChangeText={setUrlDraft}
            placeholder="http://192.168.1.50:1234/v1"
            placeholderTextColor={theme.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={inputStyle}
            onBlur={() => setBaseUrl(normalizeBaseUrl(urlDraft))}
          />
          <Text style={[styles.hint, { color: theme.textDim }]}>
            Find your Arch box's LAN IP with `ip addr`. Include :1234.
          </Text>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>API key (optional)</Text>
          <TextInput
            value={keyDraft}
            onChangeText={setKeyDraft}
            placeholder="lm-studio"
            placeholderTextColor={theme.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={inputStyle}
          />
        </View>

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

        {/* Model picker */}
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
                  {t === "dark" ? "🌙 Dark" : "☀️ Light"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.helpBox, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.helpTitle, { color: theme.text }]}>
            One-time LM Studio setup
          </Text>
          <Text style={[styles.helpText, { color: theme.textMuted }]}>
            1. In LM Studio → Developer tab, start the server on port 1234.{"\n"}
            2. Toggle "Serve on Local Network" so it binds 0.0.0.0.{"\n"}
            3. Load a model (the same one shown above).{"\n"}
            4. Make sure your phone and Arch box are on the same Wi-Fi.
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
