import React from "react";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/theme/useTheme";
import { HomeScreen } from "@/screens/HomeScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { CharacterEditorScreen } from "@/screens/CharacterEditorScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const theme = useTheme();

  const navTheme = theme.dark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: theme.bg,
          card: theme.bgElevated,
          text: theme.text,
          primary: theme.primary,
          border: theme.border,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: theme.bg,
          card: theme.bgElevated,
          text: theme.text,
          primary: theme.primary,
          border: theme.border,
        },
      };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.bgElevated },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            headerBackTitle: "Back",
            headerTransparent: false,
          }}
        />
        <Stack.Screen
          name="CharacterEditor"
          component={CharacterEditorScreen}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
