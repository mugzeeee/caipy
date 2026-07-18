import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import type { GeneratedImage } from "@/types";

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Directory inside the app's document dir where we save generated images.
 * We store only file:// URIs in the persisted store — keeps AsyncStorage small.
 */
export const IMAGE_DIR = `${FileSystem.documentDirectory}caipy-images`;

/** Ensure the images directory exists. */
export async function ensureImageDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

/** Write base64 image data to a file in our image directory. */
export async function saveImageToDisk(
  base64Data: string
): Promise<string> {
  await ensureImageDir();
  const filename = `${uid()}.png`;
  const fileUri = `${IMAGE_DIR}/${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fileUri;
}

/** Delete an image file from disk. */
export async function deleteImageFromDisk(fileUri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri);
    }
  } catch {
    // File already gone or permission issue — not critical.
  }
}

interface ImagesState {
  images: GeneratedImage[];
  add: (img: Omit<GeneratedImage, "id" | "createdAt">) => Promise<GeneratedImage>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useImagesStore = create<ImagesState>()(
  persist(
    (set, get) => ({
      images: [],

      add: async (img) => {
        const id = uid();
        const entry: GeneratedImage = { ...img, id, createdAt: Date.now() };
        set({ images: [entry, ...get().images] });
        return entry;
      },

      remove: async (id) => {
        const img = get().images.find((i) => i.id === id);
        if (img?.fileUri) {
          await deleteImageFromDisk(img.fileUri);
        }
        set({ images: get().images.filter((i) => i.id !== id) });
      },

      clear: async () => {
        // Best-effort delete all image files.
        for (const img of get().images) {
          if (img.fileUri) {
            await deleteImageFromDisk(img.fileUri).catch(() => {});
          }
        }
        set({ images: [] });
      },
    }),
    {
      name: "caipy.images",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
