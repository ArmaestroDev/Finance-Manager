// In-browser AI (web only): Qwen 3.5 9B via WebLLM on the visitor's GPU.
// The model is downloaded once (after consent) into the browser's Cache
// Storage and runs locally — no server, no API key. Only the one large model
// is offered: smaller ones categorized too unreliably (DECISIONS.md §7).
// The native counterpart (browserAi.ts) reports "unsupported".
//
// Browsers don't reveal how much graphics memory there is, and a model that
// doesn't fit usually doesn't fail — the driver spills into system RAM and it
// becomes unusably slow. So: cheap, reliable checks before the download, then
// a short speed test on the real model right after it; if that fails, the
// device is "not possible" and the files are deleted again.
import type { MLCEngine } from "@mlc-ai/web-llm";

import type { AiResponseSchema } from "./aiProviders";
import {
  BROWSER_AI_MODEL_ID,
  BrowserAiNotReadyError,
  type BrowserAiState,
  type BrowserAiUnsupportedReason,
} from "./browserAiShared";

export * from "./browserAiShared";

/** Free browser storage needed for the weights (5.06 GB) plus headroom. */
const REQUIRED_STORAGE_BYTES = 5_500 * 1024 * 1024;
/** navigator.deviceMemory (GB, Chrome caps it at 8): a 9B model needs at least this. */
const MIN_DEVICE_MEMORY_GB = 8;
/** Same context as Ollama (OLLAMA_NUM_CTX) so the same batch size fits. */
const CONTEXT_WINDOW = 8192;
/** Free the GPU again when the model hasn't been used for a while. */
const IDLE_UNLOAD_MS = 5 * 60_000;
/**
 * Speed test: a 25-transaction batch is ~3200 prompt + ~280 answer tokens
 * (measured: ~2150 + ~11 per row for 14 rows). Slower than this per batch
 * counts as "not possible" (DECISIONS.md §7.2).
 */
const MAX_BATCH_SECONDS = 150;
const BATCH_PROMPT_TOKENS = 3200;
const BATCH_ANSWER_TOKENS = 280;

// Minimal WebGPU typings (the project doesn't ship @webgpu/types).
interface GpuAdapter {
  features: { has(name: string): boolean };
  info?: { isFallbackAdapter?: boolean; vendor?: string; architecture?: string; device?: string; description?: string };
  isFallbackAdapter?: boolean;
}
type NavigatorGpu = { gpu?: { requestAdapter(o?: { powerPreference?: string }): Promise<GpuAdapter | null> } };

// ── State store (read through useBrowserAi) ──

let state: BrowserAiState = { phase: "idle" };
const listeners = new Set<() => void>();

function setState(next: BrowserAiState) {
  state = next;
  listeners.forEach((l) => l());
}

export const getBrowserAiState = (): BrowserAiState => state;

export function subscribeBrowserAi(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ── Verdict of the post-download test ──
// Remembered per GPU + model so a device that failed isn't offered the 5 GB
// download again after a reload. Web-only device info, not user data, so it
// lives in localStorage rather than a context.
const VERDICT_KEY = "browser_ai_verdict";

const gpuKey = (a: GpuAdapter) =>
  [BROWSER_AI_MODEL_ID, a.info?.vendor, a.info?.architecture, a.info?.device, a.info?.description].join("|");

function readVerdict(a: GpuAdapter): BrowserAiUnsupportedReason | null {
  try {
    const v = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? "null") as { gpu: string; reason: BrowserAiUnsupportedReason } | null;
    return v && v.gpu === gpuKey(a) ? v.reason : null;
  } catch {
    return null;
  }
}

async function saveVerdict(reason: BrowserAiUnsupportedReason) {
  const adapter = await getAdapter();
  if (!adapter) return;
  try {
    localStorage.setItem(VERDICT_KEY, JSON.stringify({ gpu: gpuKey(adapter), reason }));
  } catch {
    // storage unavailable — the device will just be offered the test again
  }
}

// ── Capability check ──

// WebLLM always runs on the "high-performance" adapter, so check that one.
async function getAdapter(): Promise<GpuAdapter | null> {
  const gpu = (navigator as unknown as NavigatorGpu).gpu;
  if (!gpu) return null;
  try {
    return await gpu.requestAdapter({ powerPreference: "high-performance" });
  } catch {
    return null;
  }
}

async function hasFreeStorage(bytes: number): Promise<boolean> {
  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota === undefined) return true;
    return quota - (usage ?? 0) >= bytes;
  } catch {
    return true;
  }
}

async function findUnsupportedReason(downloaded: boolean): Promise<BrowserAiUnsupportedReason | null> {
  const gpu = (navigator as unknown as NavigatorGpu).gpu;
  if (typeof window === "undefined" || !window.isSecureContext || !gpu) return "no_webgpu";
  const adapter = await getAdapter();
  if (!adapter || adapter.info?.isFallbackAdapter || adapter.isFallbackAdapter) return "no_gpu";
  if (!adapter.features.has("shader-f16")) return "no_f16";
  const verdict = readVerdict(adapter);
  if (verdict) return verdict;
  const ram = (navigator as { deviceMemory?: number }).deviceMemory;
  if (ram !== undefined && ram < MIN_DEVICE_MEMORY_GB) return "memory";
  if (!downloaded && !(await hasFreeStorage(REQUIRED_STORAGE_BYTES))) return "storage";
  return null;
}

const loadLib = () => import("@mlc-ai/web-llm");

async function isDownloaded(): Promise<boolean> {
  try {
    const { hasModelInCache } = await loadLib();
    return await hasModelInCache(BROWSER_AI_MODEL_ID);
  } catch {
    return false;
  }
}

let checking: Promise<void> | null = null;

/** Detect support and download state. Cheap to call repeatedly; `force` re-checks. */
export function checkBrowserAi(force = false): Promise<void> {
  const busy = state.phase === "downloading" || state.phase === "loading" || state.phase === "verifying";
  if (busy) return Promise.resolve();
  if (checking) return checking;
  if (!force && state.phase !== "idle") return Promise.resolve();
  setState({ phase: "checking" });
  checking = (async () => {
    const downloaded = await isDownloaded();
    // A loaded engine already proved the hardware fits.
    const reason = engine ? null : await findUnsupportedReason(downloaded);
    if (reason) setState({ phase: "unsupported", reason });
    else setState({ phase: downloaded ? "ready" : "available" });
  })()
    .catch((e) => setState({ phase: "error", message: e instanceof Error ? e.message : String(e) }))
    .finally(() => {
      checking = null;
    });
  return checking;
}

// ── Engine ──

let engine: MLCEngine | null = null;
let engineLoading: Promise<MLCEngine> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

/** The device can't run the model: thrown by the speed test / failed load. */
class NotPossibleError extends Error {
  constructor(public reason: BrowserAiUnsupportedReason) {
    super(reason);
  }
}

// A lost GPU device often surfaces as a follow-up error (e.g. "mapAsync …
// unmapped"), so match those too.
const isGpuFailure = (e: unknown) =>
  /out of memory|OOM|DeviceLost|device was lost|device lost|allocation|exceeds|mapAsync|unmapped/i.test(
    e instanceof Error ? `${e.name} ${e.message}` : String(e),
  );

function scheduleIdleUnload() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    void unloadEngine();
  }, IDLE_UNLOAD_MS);
}

async function unloadEngine() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  const e = engine;
  engine = null;
  if (e) await e.unload().catch(() => {});
}

// Realistic length (~1000 tokens): prefill speed measured on a short prompt
// came out ~40 % too low.
const SPEED_TEST_PROMPT =
  "Ordne jeder Buchung eine Kategorie zu (Lebensmittel, Mobilität, Wohnen, Freizeit, Shopping). Antworte nur mit JSON.\n" +
  Array.from({ length: 40 }, (_, i) => {
    const [name, text] = [
      ["REWE Markt GmbH", "REWE SAGT DANKE Kartenzahlung girocard"],
      ["ARAL Station", "Tankstelle Kartenzahlung"],
      ["Hausverwaltung Schmidt", "Miete Oktober Whg. 3 OG links"],
      ["Kino am Markt", "Online-Ticket Auftrag"],
      ["Amazon Payments Europe", "Amazon.de Bestellung"],
    ][i % 5];
    return `b${i + 1}: ${name}, ${text} ${100000 + i * 7919}, -${(i * 3.7 + 4).toFixed(2)} EUR`;
  }).join("\n");

/** Extrapolate the time a real batch would take on this device. */
async function speedTest(e: MLCEngine): Promise<number> {
  const ask = (content: string, maxTokens: number) =>
    e.chat.completions.create({
      messages: [{ role: "user", content }],
      temperature: 0,
      max_tokens: maxTokens,
      extra_body: { enable_thinking: false },
    });
  // Warm-up: the first request compiles the GPU shaders (~1.5× slower).
  await ask("Hallo", 4);
  await e.resetChat().catch(() => {});
  const reply = await ask(SPEED_TEST_PROMPT, 64);
  await e.resetChat().catch(() => {});
  const extra = reply.usage?.extra;
  if (!extra || !(extra.decode_tokens_per_s > 0) || !(extra.prefill_tokens_per_s > 0)) return 0;
  return BATCH_PROMPT_TOKENS / extra.prefill_tokens_per_s + BATCH_ANSWER_TOKENS / extra.decode_tokens_per_s;
}

/**
 * Load the model onto the GPU (downloading it first if needed). After a
 * download, the speed test decides whether this device can use it at all.
 */
function ensureEngine(mode: "download" | "load"): Promise<MLCEngine> {
  if (engine) return Promise.resolve(engine);
  if (engineLoading) return engineLoading;
  const phase = mode === "download" ? "downloading" : "loading";
  setState({ phase, progress: 0 });
  engineLoading = (async () => {
    let created: MLCEngine | null = null;
    try {
      // Ask the browser not to evict the 5 GB under storage pressure.
      await navigator.storage?.persist?.().catch(() => false);
      const { CreateMLCEngine } = await loadLib();
      created = await CreateMLCEngine(
        BROWSER_AI_MODEL_ID,
        {
          initProgressCallback: (report) => setState({ phase, progress: Math.max(0, Math.min(1, report.progress)) }),
        },
        { context_window_size: CONTEXT_WINDOW },
      );
      if (mode === "download") {
        setState({ phase: "verifying" });
        // Any failure here means the GPU can't run the model (in testing:
        // an integrated GPU lost the device on the first answer).
        const batchSeconds = await speedTest(created).catch((err) => {
          console.warn("[browserAi] speed test failed", err);
          throw new NotPossibleError("memory");
        });
        console.info(`[browserAi] estimated ${batchSeconds.toFixed(0)} s per 25-transaction batch`);
        if (!(batchSeconds > 0) || batchSeconds > MAX_BATCH_SECONDS) throw new NotPossibleError("too_slow");
      }
      engine = created;
      setState({ phase: "ready" });
      scheduleIdleUnload();
      return created;
    } catch (e) {
      if (created) await created.unload().catch(() => {});
      const reason = e instanceof NotPossibleError ? e.reason : isGpuFailure(e) ? "memory" : null;
      if (reason) {
        // Don't leave 5 GB behind for a model this device can't run.
        await removeDownloadedFiles();
        await saveVerdict(reason);
        setState({ phase: "unsupported", reason });
      } else {
        setState({ phase: "error", message: e instanceof Error ? e.message : String(e) });
      }
      throw e;
    } finally {
      engineLoading = null;
    }
  })();
  return engineLoading;
}

async function removeDownloadedFiles() {
  try {
    const { deleteModelAllInfoInCache } = await loadLib();
    await deleteModelAllInfoInCache(BROWSER_AI_MODEL_ID);
  } catch {
    // nothing cached
  }
}

/** Download the model (user consented), then verify the device is fast enough. */
export async function downloadBrowserAi(): Promise<void> {
  await ensureEngine("download").catch(() => {});
}

/** Delete the downloaded model from this browser. */
export async function removeBrowserAi(): Promise<void> {
  await unloadEngine();
  await removeDownloadedFiles();
  setState({ phase: "idle" });
  await checkBrowserAi(true);
}

// One request at a time: the engine holds a single conversation.
let queue: Promise<unknown> = Promise.resolve();

export function callBrowserAi(prompt: string, schema?: AiResponseSchema): Promise<string | null> {
  const run = async () => {
    if (!engine) {
      await checkBrowserAi();
      if (state.phase !== "ready") throw new BrowserAiNotReadyError(state);
    }
    const e = await ensureEngine("load");
    if (idleTimer) clearTimeout(idleTimer);
    try {
      const reply = await e.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        stream: false,
        // WebLLM's json_object mode needs a schema string (it throws without one).
        response_format: {
          type: "json_object",
          schema: JSON.stringify(schema && schema !== "json" ? schema : { type: "object" }),
        },
        // Reasoning is slow and not needed for classification (as with Ollama).
        extra_body: { enable_thinking: false },
      });
      const content = reply.choices[0]?.message?.content;
      // enable_thinking: false prepends an empty "<think></think>" to the text.
      return typeof content === "string" ? content.replace(/^\s*<think>[\s\S]*?<\/think>\s*/, "") : null;
    } finally {
      // Each request is independent; don't carry the previous batch along.
      await e.resetChat().catch(() => {});
      scheduleIdleUnload();
    }
  };
  const result = queue.then(run, run);
  queue = result.catch(() => {});
  return result;
}
