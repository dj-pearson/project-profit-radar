/**
 * INP (Interaction to Next Paint) Optimization Utilities
 *
 * FID (First Input Delay) is a legacy metric replaced by INP in March 2024.
 * INP measures responsiveness across ALL interactions, not just the first.
 *
 * These utilities help break up long tasks to keep INP under 200ms (good)
 * by yielding to the main thread between expensive operations.
 *
 * Usage:
 *   import { yieldToMain, runAfterInteraction } from '@/lib/inp-optimization';
 *
 *   async function handleExpensiveClick() {
 *     doPartA();
 *     await yieldToMain();
 *     doPartB();
 *     await yieldToMain();
 *     doPartC();
 *   }
 */

/**
 * Yields to the main thread so the browser can process pending user interactions.
 * Uses scheduler.yield() when available (Chrome 115+), falls back to setTimeout.
 *
 * Call this between chunks of synchronous work that exceed ~50ms.
 */
export function yieldToMain(): Promise<void> {
  // scheduler.yield() is the preferred API for INP optimization
  if ('scheduler' in globalThis && typeof (globalThis as any).scheduler?.yield === 'function') {
    return (globalThis as any).scheduler.yield();
  }

  // Fallback: setTimeout(0) yields to the event loop but doesn't preserve task priority
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Runs a callback during an idle period, avoiding blocking user interactions.
 * Ideal for non-urgent work like analytics, prefetching, or deferred rendering.
 */
export function runAfterInteraction(callback: () => void, timeout = 100): void {
  if ('requestIdleCallback' in globalThis) {
    requestIdleCallback(() => callback(), { timeout });
  } else {
    setTimeout(callback, timeout);
  }
}

/**
 * Processes an array of items in chunks, yielding between each chunk
 * to prevent long tasks from degrading INP.
 *
 * @param items - Array to process
 * @param processFn - Function to call for each item
 * @param chunkSize - Number of items per chunk before yielding (default: 5)
 */
export async function processInChunks<T>(
  items: T[],
  processFn: (item: T, index: number) => void,
  chunkSize = 5,
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    processFn(items[i], i);
    if ((i + 1) % chunkSize === 0 && i < items.length - 1) {
      await yieldToMain();
    }
  }
}

/**
 * Wraps an event handler so it yields before running expensive logic.
 * This ensures the browser can paint the immediate visual feedback
 * (button press, ripple, etc.) before the handler blocks.
 *
 * Usage:
 *   <button onClick={withINPYield(handleExpensiveAction)}>Save</button>
 */
export function withINPYield<T extends (...args: any[]) => any>(
  handler: T,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>) => {
    await yieldToMain();
    return handler(...args);
  };
}
