import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { RootNavigator } from "@/navigation/RootNavigator";
import { useSettingsStore } from "@/store/settings";
import { useTheme } from "@/theme/useTheme";
import { darkTheme } from "@/theme/colors";

export default function App() {
  const theme = useTheme();
  const hydrateSecure = useSettingsStore((s) => s.hydrateSecure);
  const [ready, setReady] = useState(false);

  // Pull server URL + API key from the Keychain before rendering so the
  // Settings screen has them populated on first paint.
  useEffect(() => {
    (async () => {
      await hydrateSecure();
      setReady(true);
    })();
  }, [hydrateSecure]);

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: darkTheme.bg }]}>
        <ActivityIndicator size="large" color={darkTheme.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={theme.dark ? "light" : "dark"} />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
