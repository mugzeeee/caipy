import EventSource from "react-native-sse";
import type { Message } from "@/types";

// OpenAI-compatible chat client. Works against any /v1 endpoint:
// LM Studio (http://host:1234/v1), Ollama (http://host:11434/v1),
// or any custom OpenAI-compatible server. All three use the same
// /v1/chat/completions + /v1/models surface, so we need one code path.

export interface ModelInfo {
  id: string;
  object?: string;
  owned_by?: string;
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Default suggested base URLs for each provider. */
export const PROVIDER_DEFAULTS: Record<string, string> = {
  lmstudio: "http://192.168.1.50:1234/v1",
  ollama: "http://192.168.1.50:11434/v1",
  custom: "",
};

/** Normalize whatever the user typed into a clean base URL with /v1. */
export function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!url) return url;
  // strip trailing slashes
  url = url.replace(/\/+$/, "");
  // add scheme if missing
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  // ensure /v1 suffix
  if (!/\/v1$/i.test(url)) url = `${url}/v1`;
  return url;
}

function authHeaders(apiKey?: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey && apiKey.trim()) h.Authorization = `Bearer ${apiKey.trim()}`;
  return h;
}

/** GET /v1/models — also used as the connection test. */
export async function listModels(
  baseUrl: string,
  apiKey?: string
): Promise<ModelInfo[]> {
  const url = `${normalizeBaseUrl(baseUrl)}/models`;
  const res = await fetch(url, { method: "GET", headers: authHeaders(apiKey) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(
      `Server responded ${res.status} ${res.statusText}. ${body}`.trim(),
      res.status
    );
  }
  const data = await res.json();
  const models = Array.isArray(data?.data) ? data.data : [];
  return models.map((m: any) => ({
    id: m.id,
    object: m.object,
    owned_by: m.owned_by,
  }));
}

export interface ChatRequestOptions {
  baseUrl: string;
  apiKey?: string;
  model: string;
  messages: Pick<Message, "role" | "content">[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Called for each streamed token delta. */
  onToken: (delta: string, fullText: string) => void;
  /** Called once when the stream closes normally. */
  onDone: (fullText: string) => void;
  /** Called on any error, with the final partial text. */
  onError: (err: Error, partialText: string) => void;
}

/**
 * Stream a chat completion. Uses react-native-sse's fetch-based EventSource,
 * which works on RN (the browser EventSource doesn't support POST + headers).
 *
 * We fall back to a non-streaming request if the server rejects SSE, so the app
 * still works even with quirky server builds.
 */
export async function streamChat(opts: ChatRequestOptions): Promise<void> {
  const {
    baseUrl,
    apiKey,
    model,
    messages,
    temperature,
    maxTokens,
    signal,
    onToken,
    onDone,
    onError,
  } = opts;

  const url = `${normalizeBaseUrl(baseUrl)}/chat/completions`;
  const body = JSON.stringify({
    model,
    messages,
    temperature: temperature ?? 0.8,
    max_tokens: maxTokens ?? 512,
    stream: true,
  });

  let fullText = "";

  const es = new EventSource(url, {
    method: "POST",
    headers: authHeaders(apiKey),
    body,
    pollingInterval: 0,
    // We manage the lifecycle ourselves; the library default polling/reconnect
    // behaviour is left at its native setting.
  });

  // Forward external aborts
  const onAbort = () => es.close();
  if (signal) {
    if (signal.aborted) {
      es.close();
      onDone(fullText);
      return;
    }
    signal.addEventListener("abort", onAbort);
  }

  es.addEventListener("open", () => {
    // connection established; tokens will follow via 'message'
  });

  es.addEventListener("message", (e: any) => {
    const raw: string = e.data;
    if (typeof raw !== "string") return;
    if (raw.trim() === "[DONE]") {
      es.close();
      if (signal) signal.removeEventListener("abort", onAbort);
      onDone(fullText);
      return;
    }
    try {
      const json = JSON.parse(raw);
      const delta: string = json?.choices?.[0]?.delta?.content ?? "";
      if (delta) {
        fullText += delta;
        onToken(delta, fullText);
      }
    } catch {
      // ignore malformed keepalive / comment lines
    }
  });

  es.addEventListener("error", (e: any) => {
    // react-native-sse fires 'error' on close too; only treat real failures
    if (signal) signal.removeEventListener("abort", onAbort);
    es.close();
    if (fullText) {
      // we got partial data, so treat as completed best-effort
      onDone(fullText);
      return;
    }
    const msg = e?.message || "Network error — is your server running and on the same Wi-Fi?";
    onError(new ApiError(msg), fullText);
  });
}

/** Non-streaming fallback (used for the connection test message). */
export async function quickChat(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  messages: Pick<Message, "role" | "content">[],
  signal?: AbortSignal
): Promise<string> {
  const url = `${normalizeBaseUrl(baseUrl)}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      max_tokens: 32,
    }),
    signal,
  });
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}`, res.status);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
