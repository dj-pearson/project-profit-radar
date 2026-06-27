/**
 * US-096: Estimate version snapshots + line-item diffing.
 *
 * Pure helpers (no I/O) so the diff logic is unit-testable. The snapshot shape
 * mirrors what the estimate form holds: header fields + line items.
 */

export interface SnapshotLineItem {
  /** Stable line-item id (preferred diff key; falls back to name when absent). */
  id?: string | null;
  item_name: string;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unit_cost?: number | null;
  category?: string | null;
}

export interface EstimateSnapshot {
  title?: string | null;
  status?: string | null;
  markup_percentage?: number | null;
  tax_percentage?: number | null;
  discount_amount?: number | null;
  notes?: string | null;
  lineItems: SnapshotLineItem[];
}

export type LineItemChangeKind = 'added' | 'removed' | 'changed' | 'unchanged';

export interface LineItemDiff {
  key: string;
  kind: LineItemChangeKind;
  before: SnapshotLineItem | null;
  after: SnapshotLineItem | null;
  /** Field names that differ (for kind === 'changed'). */
  changedFields: string[];
}

const COMPARED_FIELDS: (keyof SnapshotLineItem)[] = [
  'description',
  'quantity',
  'unit',
  'unit_cost',
  'category',
];

// Prefer a stable id so two line items with the same name don't collapse in the
// diff; fall back to the normalized name for legacy snapshots without ids.
const keyOf = (item: SnapshotLineItem) =>
  item.id ? `id:${item.id}` : `name:${(item.item_name ?? '').trim().toLowerCase()}`;

/**
 * Diff two sets of estimate line items, keyed by item name. Returns one entry
 * per item across both versions, classified as added / removed / changed /
 * unchanged, with the list of differing fields for changed items.
 */
export function diffLineItems(
  before: SnapshotLineItem[],
  after: SnapshotLineItem[]
): LineItemDiff[] {
  const beforeByKey = new Map(before.map((i) => [keyOf(i), i]));
  const afterByKey = new Map(after.map((i) => [keyOf(i), i]));
  const keys = Array.from(new Set([...beforeByKey.keys(), ...afterByKey.keys()]));

  return keys.map((key) => {
    const b = beforeByKey.get(key) ?? null;
    const a = afterByKey.get(key) ?? null;

    if (b && !a) return { key, kind: 'removed' as const, before: b, after: null, changedFields: [] };
    if (!b && a) return { key, kind: 'added' as const, before: null, after: a, changedFields: [] };

    const changedFields = COMPARED_FIELDS.filter((f) => (b?.[f] ?? null) !== (a?.[f] ?? null));
    return {
      key,
      kind: changedFields.length > 0 ? ('changed' as const) : ('unchanged' as const),
      before: b,
      after: a,
      changedFields: changedFields as string[],
    };
  });
}

/** Summary counts for a diff (e.g. for a header badge). */
export function summarizeDiff(diffs: LineItemDiff[]) {
  return {
    added: diffs.filter((d) => d.kind === 'added').length,
    removed: diffs.filter((d) => d.kind === 'removed').length,
    changed: diffs.filter((d) => d.kind === 'changed').length,
    unchanged: diffs.filter((d) => d.kind === 'unchanged').length,
  };
}
