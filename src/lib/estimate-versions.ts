/**
 * US-096: Estimate version snapshots + line-item diffing.
 *
 * Pure helpers (no I/O) so the diff logic is unit-testable. The snapshot shape
 * mirrors what the estimate form holds: header fields + line items.
 */

export interface SnapshotLineItem {
  /**
   * Persisted line-item id, if any. NOT used as the diff key: the estimate form
   * deletes and re-inserts all line items on every save, so ids are not stable
   * across versions. Kept only for reference/back-compat with older snapshots.
   */
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

const normalizedName = (item: SnapshotLineItem) => (item.item_name ?? '').trim().toLowerCase();

/**
 * Build a stable diff key for each item: normalized name plus its occurrence
 * index among same-named items. Line-item ids are NOT stable across saves (the
 * form deletes + re-inserts), so name+occurrence is the only key that survives
 * a version round-trip while still keeping duplicate names from collapsing.
 */
const keyedByNameOccurrence = (items: SnapshotLineItem[]): Map<string, SnapshotLineItem> => {
  const seen = new Map<string, number>();
  const byKey = new Map<string, SnapshotLineItem>();
  for (const item of items) {
    const name = normalizedName(item);
    const occurrence = seen.get(name) ?? 0;
    seen.set(name, occurrence + 1);
    byKey.set(`name:${name}#${occurrence}`, item);
  }
  return byKey;
};

/**
 * Diff two sets of estimate line items, keyed by item name + occurrence index.
 * Returns one entry per item across both versions, classified as added /
 * removed / changed / unchanged, with the list of differing fields for changed
 * items.
 */
export function diffLineItems(
  before: SnapshotLineItem[],
  after: SnapshotLineItem[]
): LineItemDiff[] {
  const beforeByKey = keyedByNameOccurrence(before);
  const afterByKey = keyedByNameOccurrence(after);
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
