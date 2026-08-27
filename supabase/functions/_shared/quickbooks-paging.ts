/**
 * Paging and throttle handling for the QuickBooks query API (US-252).
 *
 * Lives here rather than in quickbooks-sync/index.ts so it can be tested: that
 * file imports Deno URL modules, which vitest cannot load. `fetchImpl` is
 * injectable for the same reason — the tests drive it with a fake.
 */

// deno-lint-ignore-file no-explicit-any

/** QuickBooks caps a query response at 1000 rows and does not tell you it did. */
export const QB_PAGE_SIZE = 500;
/** Guard against an endless loop if the API ever stops advancing. */
export const QB_MAX_PAGES = 200;
export const QB_MAX_RETRIES = 4;

export interface QuickBooksAPIResponse {
  QueryResponse?: { [key: string]: any[] };
}

/** Rows fetched for one entity, plus what it took to get them. */
export interface QuickBooksFetch {
  rows: any[];
  pages: number;
  /** True if MAX_PAGES stopped us before a short page did — the result is incomplete. */
  truncated: boolean;
  /** How many times a page had to be retried after a throttle. */
  throttleRetries: number;
}

const defaultSleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch one QuickBooks entity, paging until a short page arrives.
 *
 * The previous version issued `SELECT * FROM {entity}` with no STARTPOSITION or
 * MAXRESULTS. QuickBooks answers that with at most 1000 rows and no indication
 * that more exist, so any company past that limit was silently importing a
 * prefix of its own data. It also had no 429 handling: a throttle threw, the
 * caller's try/catch logged "Error syncing customers" and moved on, and that
 * entity was skipped for the whole run.
 */
export async function fetchQuickBooksData(
  baseUrl: string,
  realmId: string,
  accessToken: string,
  entityType: string,
  deps: {
    fetchImpl?: typeof fetch;
    sleep?: (ms: number) => Promise<unknown>;
  } = {},
): Promise<QuickBooksFetch> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;

  const rows: any[] = [];
  let startPosition = 1;
  let pages = 0;
  let throttleRetries = 0;

  while (pages < QB_MAX_PAGES) {
    const query = `SELECT * FROM ${entityType} STARTPOSITION ${startPosition} MAXRESULTS ${QB_PAGE_SIZE}`;
    const url = `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`;

    let response: Response | null = null;
    for (let attempt = 0; attempt <= QB_MAX_RETRIES; attempt++) {
      response = await fetchImpl(url, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
      });

      // 429 is the documented throttle; 500/503 are transient on Intuit's side.
      if (response.status !== 429 && response.status !== 503 && response.status !== 500) break;
      if (attempt === QB_MAX_RETRIES) break;

      // Honour Retry-After when Intuit sends it, otherwise back off exponentially.
      const retryAfter = Number(response.headers.get('Retry-After'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(30000, 1000 * 2 ** attempt);

      throttleRetries++;
      console.error(
        `QuickBooks throttled ${entityType} (HTTP ${response.status}), retrying in ${waitMs}ms ` +
        `(attempt ${attempt + 1}/${QB_MAX_RETRIES})`,
      );
      await sleep(waitMs);
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : 'no response';
      console.error(`QuickBooks API error for ${entityType}:`, errorText);
      throw new Error(
        `QuickBooks API error: ${response?.status ?? '???'} - ${response?.statusText ?? 'unreachable'}`,
      );
    }

    const data: QuickBooksAPIResponse = await response.json();
    const page = data.QueryResponse?.[entityType] || [];
    rows.push(...page);
    pages++;

    // A page shorter than the window is the last one. QuickBooks has no
    // next-page cursor, so this is the only end signal available.
    if (page.length < QB_PAGE_SIZE) {
      return { rows, pages, truncated: false, throttleRetries };
    }
    startPosition += page.length;
  }

  console.error(
    `QuickBooks ${entityType}: stopped at ${QB_MAX_PAGES} pages (${rows.length} rows) without a short ` +
    `page — the import is incomplete`,
  );
  return { rows, pages, truncated: true, throttleRetries };
}
