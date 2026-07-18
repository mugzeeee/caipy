import { useSettingsStore } from "@/store/settings";
import { darkTheme, lightTheme } from "./colors";
import type { Theme } from "./types";

/** Returns the active Theme object, reacting to the user's theme setting. */
export function useTheme(): Theme {
  const themePref = useSettingsStore((s) => s.theme);
  return themePref === "light" ? lightTheme : darkTheme;
}

export type { Theme };
