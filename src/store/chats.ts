import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Chat, ChatMode, Message } from "@/types";

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function makeMessage(
  role: Message["role"],
  content: string,
  extra: Partial<Message> = {}
): Message {
  return {
    id: uid(),
    role,
    content,
    createdAt: Date.now(),
    ...extra,
  };
}

interface ChatsState {
  chats: Chat[];
  /** Ensure a chat exists for the character; create if missing. Returns chat id. */
  ensureChat: (characterId: string, opening?: Message) => string;
  /** Create a new plain assistant chat (no character). Returns chat id. */
  createAssistantChat: () => string;
  getChat: (id: string) => Chat | undefined;
  getForCharacter: (characterId: string) => Chat | undefined;
  getAssistantChats: () => Chat[];
  appendMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, patch: Partial<Message>) => void;
  removeMessagesFrom: (chatId: string, fromMessageId: string) => Message[];
  setTitle: (chatId: string, title: string) => void;
  deleteChat: (chatId: string) => void;
}

function newChat(
  mode: ChatMode,
  init: { characterId?: string; title?: string; messages?: Message[] }
): Chat {
  return {
    id: uid(),
    mode,
    characterId: init.characterId,
    title: init.title ?? "New chat",
    messages: init.messages ?? [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export const useChatsStore = create<ChatsState>()(
  persist(
    (set, get) => ({
      chats: [],

      ensureChat: (characterId, opening) => {
        const existing = get().chats.find(
          (c) => c.characterId === characterId && c.mode !== "assistant"
        );
        if (existing) return existing.id;
        const chat = newChat("character", {
          characterId,
          messages: opening ? [opening] : [],
        });
        set({ chats: [chat, ...get().chats] });
        return chat.id;
      },

      createAssistantChat: () => {
        const chat = newChat("assistant", {});
        set({ chats: [chat, ...get().chats] });
        return chat.id;
      },

      getChat: (id) => get().chats.find((c) => c.id === id),

      getForCharacter: (characterId) =>
        get().chats.find(
          (c) => c.characterId === characterId && c.mode !== "assistant"
        ),

      getAssistantChats: () =>
        get().chats.filter((c) => c.mode === "assistant"),

      appendMessage: (chatId, message) =>
        set({
          chats: get().chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: Date.now(),
                  title:
                    c.messages.length === 0 && message.role === "user"
                      ? message.content.slice(0, 40)
                      : c.title,
                }
              : c
          ),
        }),

      updateMessage: (chatId, messageId, patch) =>
        set({
          chats: get().chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, ...patch } : m
                  ),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }),

      // Drops all messages at/after fromMessageId and returns the kept prefix.
      removeMessagesFrom: (chatId, fromMessageId) => {
        const chat = get().chats.find((c) => c.id === chatId);
        if (!chat) return [];
        const idx = chat.messages.findIndex((m) => m.id === fromMessageId);
        const kept = idx === -1 ? chat.messages : chat.messages.slice(0, idx);
        set({
          chats: get().chats.map((c) =>
            c.id === chatId ? { ...c, messages: kept, updatedAt: Date.now() } : c
          ),
        });
        return kept;
      },

      setTitle: (chatId, title) =>
        set({
          chats: get().chats.map((c) =>
            c.id === chatId ? { ...c, title, updatedAt: Date.now() } : c
          ),
        }),

      deleteChat: (chatId) =>
        set({ chats: get().chats.filter((c) => c.id !== chatId) }),
    }),
    {
      name: "caipy.chats",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
