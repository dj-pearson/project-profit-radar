import { describe, it, expect, vi } from 'vitest';
import { fetchQuickBooksData, QB_PAGE_SIZE, QB_MAX_RETRIES } from './quickbooks-paging';

// The bug this guards against: the old fetch issued `SELECT * FROM {entity}` with
// no STARTPOSITION or MAXRESULTS. QuickBooks answers that with at most 1000 rows
// and no signal that more exist, so a company past that limit silently imported
// a prefix of its own data (US-252).

const rowsPage = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ Id: String(offset + i + 1) }));

function res(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: (k: string) => (init.headers ?? {})[k] ?? null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const page = (n: number, offset = 0) => res({ QueryResponse: { Customer: rowsPage(n, offset) } });
const noSleep = () => Promise.resolve();

describe('fetchQuickBooksData paging', () => {
  it('keeps paging past 1000 rows until a short page ends it', async () => {
    // 2500 rows: four full pages of 500, then a partial one.
    const pages = [page(500, 0), page(500, 500), page(500, 1000), page(500, 1500), page(100, 2000)];
    const fetchImpl = vi.fn(async () => pages.shift()!);

    const out = await fetchQuickBooksData('https://qb', 'realm', 'tok', 'Customer', { fetchImpl, sleep: noSleep });

    expect(out.rows).toHaveLength(2100);
    expect(out.pages).toBe(5);
    expect(out.truncated).toBe(false);
    // Every row is distinct — pages advanced rather than repeating the first.
    expect(new Set(out.rows.map((r: { Id: string }) => r.Id)).size).toBe(2100);
  });

  it('advances STARTPOSITION and asks for MAXRESULTS on every request', async () => {
    const pages = [page(500, 0), page(500, 500), page(3, 1000)];
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => { urls.push(url); return pages.shift()!; });

    await fetchQuickBooksData('https://qb', 'realm', 'tok', 'Customer', { fetchImpl, sleep: noSleep });

    const decoded = urls.map((u) => decodeURIComponent(u));
    expect(decoded[0]).toContain(`STARTPOSITION 1 MAXRESULTS ${QB_PAGE_SIZE}`);
    expect(decoded[1]).toContain(`STARTPOSITION 501 MAXRESULTS ${QB_PAGE_SIZE}`);
    expect(decoded[2]).toContain(`STARTPOSITION 1001 MAXRESULTS ${QB_PAGE_SIZE}`);
  });

  it('stops after a single short page', async () => {
    const fetchImpl = vi.fn(async () => page(12));
    const out = await fetchQuickBooksData('https://qb', 'realm', 'tok', 'Customer', { fetchImpl, sleep: noSleep });
    expect(out.rows).toHaveLength(12);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('treats an empty result as a complete, empty import', async () => {
    const fetchImpl = vi.fn(async () => res({ QueryResponse: {} }));
    const out = await fetchQuickBooksData('https://qb', 'realm', 'tok', 'Customer', { fetchImpl, sleep: noSleep });
    expect(out.rows).toEqual([]);
    expect(out.truncated).toBe(false);
  });
});

describe('fetchQuickBooksData throttling', () => {
  it('retries a 429 and then succeeds', async () => {
    const seq = [res({}, { status: 429 }), res({}, { status: 429 }), page(4)];
    const fetchImpl = vi.fn(async () => seq.shift()!);

    const out = await fetchQuickBooksData('https://qb', 'realm', 'tok', 'Customer', { fetchImpl, sleep: noSleep });

    expect(out.rows).toHaveLength(4);
    expect(out.throttleRetries).toBe(2);
  });

  it('honours Retry-After rather than its own backoff', async () => {
    const waits: number[] = [];
    const seq = [res({}, { status: 429, headers: { 'Retry-After': '7' } }), page(1)];
    const fetchImpl = vi.fn(async () => seq.shift()!);

    await fetchQuickBooksData('https://qb', 'realm', 'tok', 'Customer', {
      fetchImpl,
      sleep: async (ms: number) => { waits.push(ms); },
    });

    expect(waits).toEqual([7000]);
  });

  it('backs off exponentially when Retry-After is absent', async () => {
    const waits: number[] = [];
    const seq = [res({}, { status: 503 }), res({}, { status: 503 }), page(1)];
    const fetchImpl = vi.fn(async () => seq.shift()!);

    await fetchQuickBooksData('https://qb', 'realm', 'tok', 'Customer', {
      fetchImpl,
      sleep: async (ms: number) => { waits.push(ms); },
    });

    expect(waits).toEqual([1000, 2000]);
  });

  it('throws rather than returning a partial page when throttling never clears', async () => {
    const fetchImpl = vi.fn(async () => res({}, { status: 429 }));
    await expect(
      fetchQuickBooksData('https://qb', 'realm', 'tok', 'Customer', { fetchImpl, sleep: noSleep }),
    ).rejects.toThrow(/429/);
    expect(fetchImpl).toHaveBeenCalledTimes(QB_MAX_RETRIES + 1);
  });

  it('does not retry a 401 — a bad token will not fix itself', async () => {
    const fetchImpl = vi.fn(async () => res({}, { status: 401 }));
    await expect(
      fetchQuickBooksData('https://qb', 'realm', 'tok', 'Customer', { fetchImpl, sleep: noSleep }),
    ).rejects.toThrow(/401/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
