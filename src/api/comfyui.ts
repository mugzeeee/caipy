/**
 * ComfyUI API client.
 *
 * Talks to a local ComfyUI instance (http://host:8188) using its REST API.
 * We use polling instead of websockets — simpler and perfectly fine on LAN.
 *
 * Key endpoints:
 *  GET  /object_info        — available nodes + their inputs/outputs
 *  POST /prompt             — queue a workflow → returns prompt_id
 *  GET  /history/{prompt_id} — poll for completion status + output refs
 *  GET  /view?filename=...  — fetch the rendered image bytes
 */

export interface ComfyNodeInfo {
  input?: { required?: Record<string, any>; optional?: Record<string, any> };
  output?: any[];
}

/** Info returned by /history/{prompt_id}. */
export interface PromptHistoryEntry {
  prompt: any[];
  outputs?: Record<string, ComfyOutputNode>;
  status?: { completed?: boolean; status_str?: string };
}

export interface ComfyOutputNode {
  images?: Array<{
    filename: string;
    subfolder: string;
    type: string;
  }>;
}

export class ComfyError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ComfyError";
    this.status = status;
  }
}

// ── URL helpers ──────────────────────────────────────────────────────

/**
 * Normalize a ComfyUI URL. No /v1 suffix — ComfyUI uses bare paths like
 * /object_info, /prompt, /view, etc.
 */
export function normalizeComfyUrl(input: string): string {
  let url = input.trim();
  if (!url) return url;
  url = url.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url;
}

// ── Object info (models, samplers, schedulers) ─────────────────────

export async function getObjectInfo(baseUrl: string): Promise<Record<string, ComfyNodeInfo>> {
  const url = `${normalizeComfyUrl(baseUrl)}/object_info`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ComfyError(`ComfyUI ${res.status} — ${body}`.trim(), res.status);
  }
  return res.json();
}

/** Extract checkpoint names from /object_info → CheckpointLoaderSimple. */
export async function listCheckpoints(baseUrl: string): Promise<string[]> {
  const info = await getObjectInfo(baseUrl);
  const ckptNode = info["CheckpointLoaderSimple"]?.input?.required?.["ckpt_name"];
  if (Array.isArray(ckptNode?.[0])) return ckptNode[0] as string[];
  return [];
}

/** Extract sampler names from /object_info → KSampler. */
export async function listSamplers(baseUrl: string): Promise<string[]> {
  const info = await getObjectInfo(baseUrl);
  const field = info["KSampler"]?.input?.required?.["sampler_name"];
  if (Array.isArray(field?.[0])) return field[0] as string[];
  return [];
}

/** Extract scheduler names from /object_info → KSampler. */
export async function listSchedulers(baseUrl: string): Promise<string[]> {
  const info = await getObjectInfo(baseUrl);
  const field = info["KSampler"]?.input?.required?.["scheduler"];
  if (Array.isArray(field?.[0])) return field[0] as string[];
  return [];
}

// ── Workflow builder (Simple mode — built-in txt2img) ──────────────

interface WorkflowParams {
  prompt: string;
  negative?: string;
  ckpt?: string;
  sampler?: string;
  scheduler?: string;
  steps?: number;
  cfg?: number;
  width?: number;
  height?: number;
  seed?: number;
}

/**
 * Build the canonical txt2img API graph. Node ids follow ComfyUI conventions:
 *   4  = CheckpointLoaderSimple
 *   6  = CLIPTextEncode (positive)
 *   7  = CLIPTextEncode (negative)
 *   5  = EmptyLatentImage
 *   3  = KSampler
 *   9  = VAEDecode
 *   10 = SaveImage
 */
export function buildDefaultWorkflow(params: WorkflowParams): Record<string, any> {
  return {
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: params.ckpt ?? "v1-5-pruned-emaonly.safetensors" },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: params.prompt,
        clip: ["4", 1],
      },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: params.negative ?? "",
        clip: ["4", 1],
      },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: {
        width: params.width ?? 512,
        height: params.height ?? 512,
        batch_size: 1,
      },
    },
    "3": {
      class_type: "KSampler",
      inputs: {
        seed: params.seed ?? Math.floor(Math.random() * 1e15),
        steps: params.steps ?? 20,
        cfg: params.cfg ?? 7,
        sampler_name: params.sampler ?? "euler",
        scheduler: params.scheduler ?? "normal",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
    },
    "9": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2],
      },
    },
    "10": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: "Caipy",
        images: ["9", 0],
      },
    },
  };
}

// ── Advanced mode — inject user prompt into their JSON ──────────────

/**
 * Replace every occurrence of `{prompt}` in the workflow JSON string values
 * with the user's actual prompt text. The negative prompt uses `{negative}`.
 */
export function injectPrompt(
  workflowJson: Record<string, any>,
  prompt: string,
  negative?: string
): Record<string, any> {
  const raw = JSON.stringify(workflowJson);
  const replaced = raw
    .replace(/\{prompt\}/g, prompt.replace(/\\/g, "\\\\").replace(/"/g, '\\"'))
    .replace(
      /\{negative\}/g,
      (negative ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')
    );
  return JSON.parse(replaced);
}

// ── Queue + poll ────────────────────────────────────────────────────

export async function queuePrompt(
  baseUrl: string,
  workflow: Record<string, any>
): Promise<string> {
  const url = `${normalizeComfyUrl(baseUrl)}/prompt`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ComfyError(`Queue failed (${res.status}): ${body}`.trim(), res.status);
  }
  const data = await res.json();
  return data.prompt_id;
}

/** Poll /history/{promptId} until completed (or error/abort). */
export async function pollPrompt(
  baseUrl: string,
  promptId: string,
  signal?: AbortSignal,
  onProgress?: (value: number) => void
): Promise<PromptHistoryEntry> {
  const url = `${normalizeComfyUrl(baseUrl)}/history/${promptId}`;
  const POLL_MS = 1000;
  const MAX_WAIT_S = 300; // 5 minutes

  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_S * 1000) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new ComfyError(`History ${res.status}`);
      const data = await res.json();
      const entry: PromptHistoryEntry = data[promptId];
      if (entry?.outputs) return entry;
      // Still running — report rough progress if we have status info
      if (onProgress && entry?.status) {
        // ComfyUI doesn't give % easily; we just signal "active"
        onProgress(0);
      }
    } catch (e: any) {
      if (e?.name === "AbortError") throw e;
      // Network blip — retry
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  throw new ComfyError("Prompt timed out (5 min)");
}

/** Download the generated image bytes from /view. */
export async function fetchImageBytes(
  baseUrl: string,
  filename: string,
  subfolder: string,
  type: string
): Promise<Blob> {
  const params = new URLSearchParams({ filename, subfolder, type });
  const url = `${normalizeComfyUrl(baseUrl)}/view?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new ComfyError(`Image fetch failed (${res.status})`, res.status);
  return res.blob();
}
