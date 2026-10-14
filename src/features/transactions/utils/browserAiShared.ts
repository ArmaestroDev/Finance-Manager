// Types and constants shared by browserAi.web.ts and its native stub.

/** WebLLM build of the same model the Ollama path uses (qwen3.5:9b). */
export const BROWSER_AI_MODEL_ID = "Qwen3.5-9B-q4f16_1-MLC";
export const BROWSER_AI_MODEL_LABEL = "Qwen 3.5 · 9B";
/** Download size of the weights, in GB (shown in the consent dialog). */
export const BROWSER_AI_DOWNLOAD_GB = 5.1;

export type BrowserAiUnsupportedReason =
  /** No WebGPU (old browser, Firefox/Safari without it, or not HTTPS). */
  | "no_webgpu"
  /** WebGPU without a real GPU (software fallback). */
  | "no_gpu"
  /** GPU lacks 16-bit float shaders, which the model build needs. */
  | "no_f16"
  /** Too little memory (RAM below 8 GB, or the GPU ran out while loading). */
  | "memory"
  /** Runs, but the speed test after the download was far too slow. */
  | "too_slow"
  /** Not enough browser storage for the download. */
  | "storage"
  /** iOS / Android app. */
  | "native";

export type BrowserAiState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "unsupported"; reason: BrowserAiUnsupportedReason }
  /** Supported, not downloaded yet. */
  | { phase: "available" }
  | { phase: "downloading"; progress: number }
  /** Downloaded; moving it from browser storage onto the GPU. */
  | { phase: "loading"; progress: number }
  /** Speed test right after the download. */
  | { phase: "verifying" }
  /** Downloaded (and possibly loaded). */
  | { phase: "ready" }
  | { phase: "error"; message: string };

export class BrowserAiNotReadyError extends Error {
  constructor(public state: BrowserAiState) {
    super("The on-device model is not downloaded or not supported on this device.");
    this.name = "BrowserAiNotReadyError";
  }
}
