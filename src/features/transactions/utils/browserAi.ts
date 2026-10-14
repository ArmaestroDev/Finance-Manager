// Native stub of browserAi.web.ts: the in-browser model needs WebGPU, so the
// iOS/Android app reports it as unsupported (and never bundles WebLLM).
import type { AiResponseSchema } from "./aiProviders";
import { BrowserAiNotReadyError, type BrowserAiState } from "./browserAiShared";

export * from "./browserAiShared";

const state: BrowserAiState = { phase: "unsupported", reason: "native" };

export const getBrowserAiState = (): BrowserAiState => state;
export const subscribeBrowserAi = (_listener: () => void) => () => {};
export const checkBrowserAi = async (_force = false) => {};
export const downloadBrowserAi = async () => {};
export const removeBrowserAi = async () => {};

export async function callBrowserAi(_prompt: string, _schema?: AiResponseSchema): Promise<string | null> {
  throw new BrowserAiNotReadyError(state);
}
