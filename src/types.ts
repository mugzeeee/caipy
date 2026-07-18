// Shared domain types for Caipy.

export type Role = "system" | "user" | "assistant";

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

/** A conversation with a character. */
export interface Chat {
  id: string;
  characterId: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

/** App settings. Server URL + API key live in Secure Store, rest in AsyncStorage. */
export interface Settings {
  /** e.g. http://192.168.1.50:1234/v1 — no trailing slash. */
  baseUrl: string;
  /** Model id selected by the user (from /v1/models). */
  model: string;
  /** Max response tokens. */
  maxTokens: number;
  theme: "dark" | "light";
}
