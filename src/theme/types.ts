export interface Theme {
  dark: boolean;
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceMuted: string;
  primary: string;
  primaryMuted: string;
  accent: string;
  text: string;
  textMuted: string;
  textDim: string;
  border: string;
  bubbleUser: string;
  bubbleUserText: string;
  bubbleAssistant: string;
  bubbleAssistantText: string;
  danger: string;
  success: string;
  overlay: string;
  /** Gradient start colour (primary button gradient). */
  gradientStart: string;
  /** Gradient end colour (primary button gradient). */
  gradientEnd: string;
  /** Soft glow behind focused elements. */
  glow: string;
  /** Hover / highlight tint for cards. */
  cardHighlight: string;
  /** Active ring colour (tab bar, avatar ring). */
  ringActive: string;
}
