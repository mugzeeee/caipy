// Shared domain types for Caipy.

export type Role = "system" | "user" | "assistant";

/** Which backend the OpenAI-compatible client points at. */
export type Provider = "lmstudio" | "ollama" | "custom";

/** A single chat message persisted in a conversation. */
export interface Message {
  id: string;
  role: Role;
  content: string;
  /** Epoch ms when the message was created. */
  createdAt: number;
  /** True while an assistant message is still streaming tokens in. */
  streaming?: boolean;
  /** Set if generation errored; content holds the error text. */
  error?: boolean;
}

/** A user-created character card. */
export interface Character {
  id: string;
  name: string;
  /** Display avatar: an emoji OR a base64 data URI for an image. */
  avatar: string;
  /** Short tagline shown on the card. */
  greeting: string;
  /** First message the character sends when a new chat opens. */
  openingMessage: string;
  /** Backing system prompt that defines the persona. */
  systemPrompt: string;
  /** Sampling temperature, 0..2. */
  temperature: number;
  createdAt: number;
}

/** What kind of conversation it is. Undefined on legacy data ⇒ "character". */
export type ChatMode = "character" | "assistant";

/** A conversation. Either with a Character, or a plain assistant thread. */
export interface Chat {
  id: string;
  /** Mode. Defaults to "character" when absent (back-compat with v1 data). */
  mode?: ChatMode;
  /** Required for character chats; absent for assistant chats. */
  characterId?: string;
  /** For assistant chats: an optional override system prompt. */
  systemPrompt?: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

/** App settings. Server URL + API key live in Secure Store, rest in AsyncStorage. */
export interface Settings {
  /** Which provider the OpenAI-compatible client points at. */
  provider: Provider;
  /** e.g. http://192.168.1.50:1234/v1 — no trailing slash. */
  baseUrl: string;
  /** Model id selected by the user (from /v1/models). */
  model: string;
  /** Max response tokens. */
  maxTokens: number;
  /** System prompt used by the plain Assistant mode. */
  assistantSystemPrompt: string;
  /** ComfyUI server URL (no /v1). */
  comfyUrl: string;
  theme: "dark" | "light";
}

/** A generated image (image-gen tab). The bytes live on disk; we store the URI. */
export interface GeneratedImage {
  id: string;
  prompt: string;
  negative?: string;
  /** Compact record of the params used (model, sampler, steps, cfg, size, seed). */
  params: Record<string, string | number>;
  /** file:// URI to the saved image in the app's document directory. */
  fileUri: string;
  /** "simple" = built-in workflow, "advanced" = user-pasted JSON. */
  source: "simple" | "advanced";
  createdAt: number;
}
