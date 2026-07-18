import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Character } from "@/types";

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Built-in starter characters so the app isn't empty on first launch. */
function seedCharacters(): Character[] {
  const now = Date.now();
  return [
    {
      id: uid(),
      name: "Aria",
      avatar: "🌙",
      greeting: "Calm, curious night-owl who loves deep chats.",
      openingMessage: "Hey, you're up late too, huh? What's on your mind?",
      systemPrompt:
        "You are Aria, a calm, curious friend who loves late-night conversation. Be warm, concise, and ask thoughtful follow-up questions.",
      temperature: 0.8,
      createdAt: now,
    },
    {
      id: uid(),
      name: "Captain Byte",
      avatar: "🤖",
      greeting: "A peppy pirate captain who speaks in code metaphors.",
      openingMessage: "Arrr, a new shipmate! Hoist the RAM, we set sail at once!",
      systemPrompt:
        "You are Captain Byte, a peppy pirate captain who speaks in programming and code metaphors. Stay playful but helpful.",
      temperature: 0.9,
      createdAt: now - 1000,
    },
    {
      id: uid(),
      name: "Study Buddy",
      avatar: "📚",
      greeting: "Patient tutor who explains anything, simply.",
      openingMessage: "What are we learning today? Break it down and we'll go step by step.",
      systemPrompt:
        "You are Study Buddy, a patient tutor. Explain things simply with analogies, check understanding, and never condescend.",
      temperature: 0.5,
      createdAt: now - 2000,
    },
  ];
}

interface CharactersState {
  characters: Character[];
  upsert: (c: Omit<Character, "id" | "createdAt"> & { id?: string }) => string;
  remove: (id: string) => void;
  getById: (id: string) => Character | undefined;
}

export const useCharactersStore = create<CharactersState>()(
  persist(
    (set, get) => ({
      characters: seedCharacters(),
      upsert: (c) => {
        const existing = c.id ? get().characters.find((x) => x.id === c.id) : null;
        if (existing) {
          set({
            characters: get().characters.map((x) =>
              x.id === existing.id ? { ...x, ...c, id: existing.id } : x
            ),
          });
          return existing.id;
        }
        const id = uid();
        const character: Character = { ...c, id, createdAt: Date.now() } as Character;
        set({ characters: [character, ...get().characters] });
        return id;
      },
      remove: (id) => set({ characters: get().characters.filter((x) => x.id !== id) }),
      getById: (id) => get().characters.find((x) => x.id === id),
    }),
    {
      name: "caipy.characters",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
