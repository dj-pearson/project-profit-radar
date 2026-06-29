/**
 * US-232: Bid leveling + estimate variance — pure, I/O-free helpers.
 *
 * The comparison math (per-line normalization, scope-gap + outlier detection,
 * bid totals, variance vs estimate) lives here so it's unit-testable. Supabase
 * I/O lives in services/bidLevelingService.ts.
 */

export interface BidScopeItem {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
  estimate_amount: number;
  sort_order: number;
}

export interface BidInfo {
  id: string;
  vendor_name: string;
  is_awarded: boolean;
}

export interface BidLineItem {
  bid_id: string;
  scope_item_id: string;
  amount: number | null;
  included: boolean;
}

/** A single bid's value for a scope line in the leveling matrix. */
export interface LeveledCell {
  bidId: string;
  amount: number | null;
  /** The bid didn't quote/cover this scope line (no amount or excluded). */
  isGap: boolean;
  /** Amount deviates markedly from the median quote for this line. */
  isOutlier: boolean;
  /** Lowest quote for this line. */
  isLowest: boolean;
}

export interface LeveledRow {
  scopeItem: BidScopeItem;
  cells: LeveledCell[];
  /** Quoted amounts (non-gap) for this line. */
  quotes: number[];
  median: number | null;
}

export interface BidTotal {
  bidId: string;
  vendorName: string;
  isAwarded: boolean;
  /** Sum of quoted (included, non-null) amounts. */
  total: number;
  /** Number of scope lines this bid did not cover. */
  gaps: number;
  /** total − estimateTotal (positive = over estimate). */
  variance: number;
}

export interface LevelingResult {
  rows: LeveledRow[];
  totals: BidTotal[];
  estimateTotal: number;
}

/** Outlier threshold: a quote >40% away from the line's median is flagged. */
const OUTLIER_RATIO = 0.4;

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** A line item counts as a scope gap if it's excluded or has no amount. */
export function isScopeGap(item: BidLineItem | undefined): boolean {
  return !item || !item.included || item.amount == null;
}

/**
 * Build the leveling matrix: one row per scope item with each bid's cell
 * (amount, gap/outlier/lowest flags), plus per-bid totals and variance vs the
 * estimate. Bids keep their input order; rows follow scope sort_order then input.
 */
export function levelBids(
  scopeItems: BidScopeItem[],
  bids: BidInfo[],
  lineItems: BidLineItem[]
): LevelingResult {
  const byBidAndScope = new Map<string, BidLineItem>();
  for (const li of lineItems) byBidAndScope.set(`${li.bid_id}:${li.scope_item_id}`, li);

  const orderedScope = [...scopeItems].sort((a, b) => a.sort_order - b.sort_order);

  const rows: LeveledRow[] = orderedScope.map((scopeItem) => {
    const quotes: number[] = [];
    for (const bid of bids) {
      const li = byBidAndScope.get(`${bid.id}:${scopeItem.id}`);
      if (!isScopeGap(li)) quotes.push(li!.amount as number);
    }
    const med = median(quotes);
    const lowest = quotes.length ? Math.min(...quotes) : null;

    const cells: LeveledCell[] = bids.map((bid) => {
      const li = byBidAndScope.get(`${bid.id}:${scopeItem.id}`);
      const gap = isScopeGap(li);
      const amount = gap ? null : (li!.amount as number);
      const isOutlier =
        !gap && med != null && med > 0 && Math.abs((amount as number) - med) / med > OUTLIER_RATIO;
      return {
        bidId: bid.id,
        amount,
        isGap: gap,
        isOutlier,
        isLowest: !gap && lowest != null && amount === lowest,
      };
    });

    return { scopeItem, cells, quotes, median: med };
  });

  const estimateTotal = orderedScope.reduce((sum, s) => sum + (s.estimate_amount ?? 0), 0);

  const totals: BidTotal[] = bids.map((bid) => {
    let total = 0;
    let gaps = 0;
    for (const scopeItem of orderedScope) {
      const li = byBidAndScope.get(`${bid.id}:${scopeItem.id}`);
      if (isScopeGap(li)) gaps += 1;
      else total += li!.amount as number;
    }
    return {
      bidId: bid.id,
      vendorName: bid.vendor_name,
      isAwarded: bid.is_awarded,
      total,
      gaps,
      variance: total - estimateTotal,
    };
  });

  return { rows, totals, estimateTotal };
}

/** The lowest-total bid id (ignoring gaps), or null when there are no bids. */
export function lowestBidId(totals: BidTotal[]): string | null {
  if (!totals.length) return null;
  return totals.reduce((lo, t) => (t.total < lo.total ? t : lo)).bidId;
}
