import { Platform } from "react-native";

import { callBrowserAi } from "./browserAi";

/** "browser" = Qwen 3.5 9B on the visitor's GPU via WebGPU (web only, see browserAi.web.ts). */
export type AiProvider = "gemini" | "claude" | "ollama" | "browser";

/** Providers that run on the user's own machine and need no API key. */
export const isLocalProvider = (provider: AiProvider) => provider === "ollama" || provider === "browser";

export const OLLAMA_DEFAULT_URL = "http://localhost:11434";
export const OLLAMA_DEFAULT_MODEL = "qwen3.5:9b";

/** Context window requested from Ollama (prompt + answer). See DECISIONS.md §6. */
export const OLLAMA_NUM_CTX = 8192;
/** Cold model load can take ~40 s on a consumer GPU; a batch another ~10 s. */
const OLLAMA_TIMEOUT_MS = 120_000;

/** Transactions per categorization request. Smaller locally: fits num_ctx, faster progress. */
export const aiBatchSize = (provider: AiProvider) => (isLocalProvider(provider) ? 25 : 50);

/** Everything needed to reach the selected provider (from SettingsContext). */
export interface AiConfig {
  provider: AiProvider;
  geminiApiKey: string | null;
  claudeApiKey: string | null;
  ollamaUrl: string;
  ollamaModel: string;
}

/** The cloud key the provider needs, "" for local providers (no key), null when missing. */
export function aiApiKeyFor(cfg: AiConfig): string | null {
  if (isLocalProvider(cfg.provider)) return "";
  const key = cfg.provider === "claude" ? cfg.claudeApiKey : cfg.geminiApiKey;
  return key || null;
}

/** JSON schema for structured output (Ollama `format`); "json" for any JSON. */
export type AiResponseSchema = Record<string, unknown> | "json";

interface CallParams {
  config: AiConfig;
  prompt: string;
  /** Only used by the local providers, which constrain decoding to it. */
  schema?: AiResponseSchema;
}

export async function callAiProvider({
  config,
  prompt,
  schema,
}: CallParams): Promise<string | null> {
  if (config.provider === "ollama") {
    return callOllama(config.ollamaUrl, config.ollamaModel, prompt, schema);
  }
  if (config.provider === "browser") return callBrowserAi(prompt, schema);
  const apiKey = aiApiKeyFor(config);
  if (!apiKey) throw new Error("API key missing");
  if (config.provider === "claude") return callClaude(apiKey, prompt);
  return callGemini(apiKey, prompt);
}

// ── Ollama (local) ──

export const normalizeOllamaUrl = (url: string) =>
  (url.trim() || OLLAMA_DEFAULT_URL).replace(/\/+$/, "");

export class OllamaUnreachableError extends Error {
  constructor(baseUrl: string) {
    super(`Ollama is not reachable at ${baseUrl}. Is Ollama running?`);
    this.name = "OllamaUnreachableError";
  }
}

export class OllamaModelMissingError extends Error {
  constructor(public model: string) {
    super(`Model "${model}" is not installed. Run: ollama pull ${model}`);
    this.name = "OllamaModelMissingError";
  }
}

async function ollamaFetch(
  baseUrl: string,
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const url = normalizeOllamaUrl(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${url}${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Ollama did not answer within ${Math.round(timeoutMs / 1000)} s.`);
    }
    // fetch rejects with a TypeError for refused connections and CORS blocks.
    void err;
    throw new OllamaUnreachableError(url);
  } finally {
    clearTimeout(timer);
  }
}

export async function callOllama(
  baseUrl: string,
  model: string,
  prompt: string,
  schema?: AiResponseSchema,
): Promise<string | null> {
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
    stream: false,
    // Qwen3-style reasoning is slow and not needed for classification.
    think: false,
    options: { temperature: 0, num_ctx: OLLAMA_NUM_CTX },
  };
  if (schema) body.format = schema;

  const response = await ollamaFetch(
    baseUrl,
    "/api/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    OLLAMA_TIMEOUT_MS,
  );

  if (!response.ok) {
    let errorMsg = `Ollama request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (typeof errorData?.error === "string") errorMsg = errorData.error;
    } catch {
      // body not JSON
    }
    if (response.status === 404 || /not found/i.test(errorMsg)) {
      throw new OllamaModelMissingError(model);
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return typeof data?.message?.content === "string" ? data.message.content : null;
}

/** Names of the locally installed models (GET /api/tags). Throws when unreachable. */
export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  const response = await ollamaFetch(baseUrl, "/api/tags", { method: "GET" }, 5_000);
  if (!response.ok) throw new OllamaUnreachableError(normalizeOllamaUrl(baseUrl));
  const data = await response.json();
  const models: { name?: unknown }[] = Array.isArray(data?.models) ? data.models : [];
  return models
    .map((m) => (typeof m.name === "string" ? m.name : ""))
    .filter(Boolean)
    .sort();
}

/** "qwen3.5" matches the installed "qwen3.5:latest". */
export const ollamaHasModel = (installed: string[], model: string) => {
  const want = model.trim();
  return installed.some((m) => m === want || m === `${want}:latest`);
};

// ── Cloud ──

async function callGemini(apiKey: string, prompt: string): Promise<string | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error?.message || errorMsg;
    } catch {
      // body not JSON
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callClaude(apiKey: string, prompt: string): Promise<string | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  // Required by the Anthropic API to allow direct browser calls (CORS).
  if (Platform.OS === "web") {
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error?.message || errorMsg;
    } catch {
      // body not JSON
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const block = data.content?.find((c: { type: string }) => c.type === "text");
  return block?.text ?? null;
}
