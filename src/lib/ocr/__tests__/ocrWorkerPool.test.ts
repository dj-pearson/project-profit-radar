import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock tesseract.js with a single factory we can inspect. Each createWorker call
// returns a fresh mock worker with recognize/terminate spies.
const createdWorkers: Array<{ recognize: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> }> = [];
const createWorker = vi.fn(async () => {
  const worker = {
    recognize: vi.fn(async () => ({ data: { text: 'hello', confidence: 91 } })),
    terminate: vi.fn(async () => undefined),
  };
  createdWorkers.push(worker);
  return worker;
});

vi.mock('tesseract.js', () => ({ createWorker }));

// Re-import the module fresh per test so its module-level pool state is clean.
async function freshPool() {
  vi.resetModules();
  return import('../ocrWorkerPool');
}

describe('ocrWorkerPool', () => {
  beforeEach(() => {
    createdWorkers.length = 0;
    createWorker.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shares ONE worker across concurrent holders', async () => {
    const { acquireOcr } = await freshPool();
    const a = await acquireOcr();
    const b = await acquireOcr();

    expect(createWorker).toHaveBeenCalledTimes(1); // single shared worker

    const r = await a.recognize('img');
    expect(r).toEqual({ text: 'hello', confidence: 91 });

    a.release();
    b.release();
  });

  it('does NOT leak: terminates the worker once idle after all holds released', async () => {
    const { acquireOcr } = await freshPool();
    const h = await acquireOcr();
    await h.recognize('img');
    h.release();

    // Not terminated immediately (kept warm for the idle window).
    expect(createdWorkers[0].terminate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(31_000); // past the 30s idle timeout
    expect(createdWorkers[0].terminate).toHaveBeenCalledTimes(1);
  });

  it('stays flat across 10 sequential uploads (one worker, one terminate)', async () => {
    const { acquireOcr } = await freshPool();
    for (let i = 0; i < 10; i++) {
      const h = await acquireOcr();
      await h.recognize('img');
      h.release();
    }
    // Reused the same worker for every upload — no per-upload worker creation.
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(createdWorkers).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(31_000);
    expect(createdWorkers[0].terminate).toHaveBeenCalledTimes(1);
  });

  it('re-acquiring within the idle window cancels the pending terminate', async () => {
    const { acquireOcr } = await freshPool();
    const h1 = await acquireOcr();
    h1.release();
    await vi.advanceTimersByTimeAsync(10_000); // partway through idle window

    const h2 = await acquireOcr(); // re-acquire cancels the scheduled terminate
    await vi.advanceTimersByTimeAsync(31_000);
    expect(createWorker).toHaveBeenCalledTimes(1); // same worker
    expect(createdWorkers[0].terminate).not.toHaveBeenCalled(); // still held

    h2.release();
    await vi.advanceTimersByTimeAsync(31_000);
    expect(createdWorkers[0].terminate).toHaveBeenCalledTimes(1);
  });
});
