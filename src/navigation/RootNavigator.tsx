import React from "react";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useTheme } from "@/theme/useTheme";
import { BottomTabs } from "./Tabs";

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
      <BottomTabs />
    </NavigationContainer>
  );
}
