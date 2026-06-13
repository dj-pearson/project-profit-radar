/**
 * Shared, ref-counted Tesseract.js worker pool (US-217).
 *
 * Problem this solves:
 *  - tesseract.js (~3.5MB) was top-level imported into component chunks, and
 *    each OCR call spun up its own worker. DocumentOCRProcessor used the
 *    one-shot recognize and could leave workers around, leaking ~50MB each.
 *
 * This module:
 *  - dynamically imports tesseract.js only on first use (so it is absent from
 *    non-OCR route chunks),
 *  - keeps a SINGLE shared worker behind ref-counting,
 *  - serializes recognize() calls on that worker and routes per-call progress,
 *  - terminates the worker once nothing holds it and an idle timeout elapses,
 *    so memory stays flat across many sequential uploads.
 */

export interface OcrResult {
  text: string;
  confidence: number;
}

export type OcrProgress = (percent: number) => void;

export interface OcrHandle {
  /** Run OCR on an image (data URL, File, Blob, or HTMLCanvasElement). */
  recognize(image: unknown, onProgress?: OcrProgress): Promise<OcrResult>;
  /** Release this hold. The shared worker is terminated when no holds remain. */
  release(): void;
}

// tesseract.js Worker — typed loosely so this module never pulls the type into
// non-OCR bundles.
type TesseractWorker = {
  recognize(image: unknown): Promise<{ data: { text: string; confidence: number } }>;
  terminate(): Promise<unknown>;
};

const IDLE_TERMINATE_MS = 30_000;

let workerPromise: Promise<TesseractWorker> | null = null;
let refCount = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
// Only one recognize runs at a time on the shared worker; this routes its
// progress events to the caller that is currently active.
let activeProgress: OcrProgress | null = null;
let chain: Promise<unknown> = Promise.resolve();

/**
 * Whether OCR can run in this browser. Tesseract.js needs Web Workers and
 * WebAssembly; older/locked-down browsers lack one or both, in which case
 * callers should fall back to manual text entry.
 */
export function isOcrSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined"
  );
}

function clearIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function scheduleTerminate(): void {
  clearIdleTimer();
  idleTimer = setTimeout(() => {
    void terminateNow();
  }, IDLE_TERMINATE_MS);
}

async function terminateNow(): Promise<void> {
  if (refCount > 0) return; // someone re-acquired in the meantime
  const pending = workerPromise;
  workerPromise = null;
  clearIdleTimer();
  if (pending) {
    try {
      const worker = await pending;
      await worker.terminate();
    } catch {
      // worker may already be gone; ignore
    }
  }
}

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return (await createWorker("eng", undefined, {
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status === "recognizing text" && activeProgress) {
            activeProgress(Math.round((m.progress ?? 0) * 100));
          }
        },
      })) as unknown as TesseractWorker;
    })();
  }
  return workerPromise;
}

/** Serialize work on the single shared worker. */
function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn) as Promise<T>;
  chain = run.catch(() => undefined);
  return run;
}

/**
 * Acquire a hold on the shared OCR worker. ALWAYS call release() (e.g. in a
 * finally / useEffect cleanup) so the worker can be torn down.
 */
export async function acquireOcr(): Promise<OcrHandle> {
  refCount += 1;
  clearIdleTimer();
  // Warm the worker up front so the first recognize() isn't cold.
  await getWorker();

  let released = false;
  return {
    async recognize(image: unknown, onProgress?: OcrProgress): Promise<OcrResult> {
      const worker = await getWorker();
      return runExclusive(async () => {
        activeProgress = onProgress ?? null;
        try {
          const { data } = await worker.recognize(image);
          return { text: data.text, confidence: data.confidence };
        } finally {
          activeProgress = null;
        }
      });
    },
    release(): void {
      if (released) return;
      released = true;
      refCount = Math.max(0, refCount - 1);
      if (refCount === 0) scheduleTerminate();
    },
  };
}
