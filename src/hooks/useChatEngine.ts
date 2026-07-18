import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { useChatsStore, makeMessage } from "@/store/chats";
import { useSettingsStore } from "@/store/settings";
import { streamChat, ApiError } from "@/api/chat";
import type { Message } from "@/types";

/**
 * Shared chat engine for both character and assistant conversations.
 *
 * The big performance trick: instead of writing to the store on every streamed
 * token (each write = full chats-array map + FlatList re-render), we buffer the
 * incoming text and flush at ~30fps. The UI still feels live because 30fps is
 * faster than tokens arrive anyway, but we go from "N renders per token" to
 * "≤30 renders per second total".
 */
export interface UseChatEngineOptions {
  chatId: string | undefined;
  /** System prompt to prepend (character's, or the assistant default). */
  systemPrompt: string;
  /** Sampling temperature. */
  temperature: number;
  /** Display name shown in the placeholder / error fallbacks. */
  fallbackName?: string;
  /** Called whenever generation starts/stops — screens use it to toggle UI. */
  onGeneratingChange?: (busy: boolean) => void;
}

const FLUSH_INTERVAL_MS = 33; // ~30fps

export function useChatEngine(opts: UseChatEngineOptions) {
  const { chatId, systemPrompt, temperature, onGeneratingChange } = opts;

  const appendMessage = useChatsStore((s) => s.appendMessage);
  const updateMessage = useChatsStore((s) => s.updateMessage);
  const removeMessagesFrom = useChatsStore((s) => s.removeMessagesFrom);

  const baseUrl = useSettingsStore((s) => s.baseUrl);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const model = useSettingsStore((s) => s.model);
  const maxTokens = useSettingsStore((s) => s.maxTokens);

  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Throttle plumbing: the latest streamed text + a pending flush timer.
  const pendingRef = useRef<{ chatId: string; msgId: string; text: string } | null>(
    null
  );
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setBusy = (b: boolean) => {
    setGenerating(b);
    onGeneratingChange?.(b);
  };

  const flushNow = useCallback(() => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    updateMessage(p.chatId, p.msgId, { content: p.text, streaming: true });
  }, [updateMessage]);

  // Cleanup on unmount: stop any stream and flush the last chunk.
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const scheduleFlush = (chatId: string, msgId: string, text: string) => {
    pendingRef.current = { chatId, msgId, text };
    if (flushTimerRef.current) return; // already scheduled
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flushNow();
    }, FLUSH_INTERVAL_MS);
  };

  const sendDisabled = !baseUrl || !model;

  const buildApiMessages = (history: Message[]) => {
    const sys = { role: "system" as const, content: systemPrompt };
    // Trim to last ~16 turns to keep tokens sane.
    const trimmed = history.slice(-32).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    return [sys, ...trimmed.filter((m) => m.role !== "system")];
  };

  const runGeneration = useCallback(
    async (history: Message[]) => {
      if (!chatId) return;
      if (sendDisabled) return;

      const placeholder = makeMessage("assistant", "", { streaming: true });
      appendMessage(chatId, placeholder);
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let firstToken = true;

      await streamChat({
        baseUrl,
        apiKey,
        model,
        messages: buildApiMessages(history),
        temperature,
        maxTokens,
        signal: controller.signal,
        onToken: (_delta, full) => {
          if (firstToken) {
            firstToken = false;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          // Throttled write — see file header.
          scheduleFlush(chatId, placeholder.id, full);
        },
        onDone: (full) => {
          if (flushTimerRef.current) {
            clearTimeout(flushTimerRef.current);
            flushTimerRef.current = null;
          }
          pendingRef.current = null;
          updateMessage(chatId, placeholder.id, {
            content: full || "_(no response)_",
            streaming: false,
          });
          setBusy(false);
          abortRef.current = null;
        },
        onError: (err, partial) => {
          if (flushTimerRef.current) {
            clearTimeout(flushTimerRef.current);
            flushTimerRef.current = null;
          }
          pendingRef.current = null;
          const msg =
            err instanceof ApiError && err.status
              ? err.message
              : "Couldn't reach the server. Check it's running and reachable from your phone.";
          updateMessage(chatId, placeholder.id, {
            content: partial || msg,
            streaming: false,
            error: !partial,
          });
          setBusy(false);
          abortRef.current = null;
        },
      });
    },
    // systemPrompt/temperature intentionally read fresh via closure at call time;
    // we don't want to re-create the callback on every keystroke of a parent input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId, baseUrl, apiKey, model, maxTokens, appendMessage, updateMessage]
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || generating || !chatId) return;

      const userMsg = makeMessage("user", trimmed);
      appendMessage(chatId, userMsg);

      // Build history from the freshest store state (after the append above).
      const fresh =
        useChatsStore.getState().chats.find((c) => c.id === chatId)?.messages ??
        [];
      runGeneration(fresh);
    },
    [chatId, generating, appendMessage, runGeneration]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    // Flush whatever we have and mark the placeholder not-streaming.
    if (chatId) {
      flushNow();
      const chat = useChatsStore.getState().chats.find((c) => c.id === chatId);
      const last = chat?.messages[chat.messages.length - 1];
      if (last?.streaming) {
        updateMessage(chatId, last.id, { streaming: false });
      }
    }
  }, [chatId, flushNow, updateMessage]);

  const regenerate = useCallback(
    (messages: Message[]) => {
      if (generating || !chatId) return;
      const last = messages[messages.length - 1];
      if (!last || last.role !== "assistant") return;
      removeMessagesFrom(chatId, last.id);
      const fresh =
        useChatsStore.getState().chats.find((c) => c.id === chatId)?.messages ??
        [];
      runGeneration(fresh);
    },
    [chatId, generating, removeMessagesFrom, runGeneration]
  );

  return {
    generating,
    send,
    stop,
    regenerate,
    sendDisabled,
  };
}
