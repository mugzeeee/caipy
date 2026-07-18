import { Theme } from "./types";

/** Character.AI-inspired dark palette + a matching light variant. */
export const darkTheme: Theme = {
  dark: true,
  bg: "#0e0f13",
  bgElevated: "#1a1b22",
  surface: "#22232c",
  surfaceMuted: "#171820",
  primary: "#8b5cf6", // C.AI purple
  primaryMuted: "#6d28d9",
  accent: "#f472b6", // pink accent for the send arrow
  text: "#f5f5f7",
  textMuted: "#9b9ba3",
  textDim: "#6b6b73",
  border: "#2a2b35",
  bubbleUser: "#8b5cf6",
  bubbleUserText: "#ffffff",
  bubbleAssistant: "#22232c",
  bubbleAssistantText: "#f5f5f7",
  danger: "#ef4444",
  success: "#22c55e",
  overlay: "rgba(0,0,0,0.5)",
};

export const lightTheme: Theme = {
  dark: false,
  bg: "#ffffff",
  bgElevated: "#f6f6f8",
  surface: "#ffffff",
  surfaceMuted: "#f0f0f3",
  primary: "#8b5cf6",
  primaryMuted: "#a78bfa",
  accent: "#ec4899",
  text: "#1a1b22",
  textMuted: "#6b6b73",
  textDim: "#9b9ba3",
  border: "#e5e5ea",
  bubbleUser: "#8b5cf6",
  bubbleUserText: "#ffffff",
  bubbleAssistant: "#f0f0f3",
  bubbleAssistantText: "#1a1b22",
  danger: "#dc2626",
  success: "#16a34a",
  overlay: "rgba(0,0,0,0.3)",
};

export { Theme } from "./types";
