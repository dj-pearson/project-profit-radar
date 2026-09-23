/**
 * Row virtualization for long tables and lists (US-270).
 *
 * One hook and three components:
 *
 * - `useVirtualRows`  - (use-virtual-rows.ts) wraps @tanstack/react-virtual. Below `threshold` rows
 *                       it is a pass-through: every index is returned and no
 *                       scroll container is imposed, so short lists render
 *                       exactly as before.
 * - `VirtualSpacerRow` - the empty <tr> that stands in for rows scrolled out
 *                       of view. Real <tr>s stay inside a real <tbody>, so
 *                       column widths, `scope="col"` headers and table
 *                       semantics survive virtualization (the old InvoiceList
 *                       path put <div>s inside one giant <td>, which a screen
 *                       reader announced as a single cell).
 * - `VirtualizedTable` - a drop-in for the shadcn <Table> when a page renders
 *                       one row per item. Sets aria-rowcount / aria-rowindex
 *                       so assistive tech reports "row 812 of 5000" even
 *                       though only ~30 rows are in the DOM.
 * - `VirtualizedList` - the same for card lists (role="list" with
 *                       aria-setsize / aria-posinset on each item).
 *
 * Rows may have any height: each rendered row is measured, and the estimate
 * is only used until then.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { useVirtualRows } from './use-virtual-rows';

const DEFAULT_MAX_HEIGHT = '70vh';

/** An empty, hidden <tr> of a given height standing in for off-screen rows. */
export function VirtualSpacerRow({ height, colSpan }: { height: number; colSpan: number }) {
  if (height <= 0) return null;
  return (
    <tr aria-hidden="true" data-virtual-spacer="">
      <td colSpan={colSpan} style={{ height, padding: 0, border: 0 }} />
    </tr>
  );
}

export interface VirtualizedTableProps<T> {
  /** Rows to display, already filtered and sorted. */
  rows: T[];
  /** Stable key per row. */
  getRowKey: (row: T, index: number) => React.Key;
  /** Accessible name for the table. */
  'aria-label': string;
  /** Header cells (<TableHead>s); wrapped in a sticky <thead><tr>. */
  header: React.ReactNode;
  /** Number of columns, for spacer and footer colSpan. */
  columnCount: number;
  /** Cells (<TableCell>s) for one row; wrapped in a <tr>. */
  renderCells: (row: T, index: number) => React.ReactNode;
  /** Extra classes for a row's <tr>. */
  rowClassName?: (row: T, index: number) => string | undefined;
  /** Rows rendered after the data rows inside a <tfoot> (e.g. totals). */
  footer?: React.ReactNode;
  /** How many <tr>s `footer` contains, for aria-rowcount. */
  footerRowCount?: number;
  estimateRowHeight?: number;
  overscan?: number;
  threshold?: number;
  /** Height of the scroll viewport when virtualized. */
  maxHeight?: string;
  className?: string;
}

/**
 * A shadcn-styled table that virtualizes its body above `threshold` rows.
 * The header stays sticky inside the scroll viewport.
 */
export function VirtualizedTable<T>({
  rows,
  getRowKey,
  'aria-label': ariaLabel,
  header,
  columnCount,
  renderCells,
  rowClassName,
  footer,
  footerRowCount = 0,
  estimateRowHeight = 48,
  overscan,
  threshold,
  maxHeight = DEFAULT_MAX_HEIGHT,
  className,
}: VirtualizedTableProps<T>) {
  const v = useVirtualRows({
    count: rows.length,
    estimateRowHeight,
    overscan,
    threshold,
    getItemKey: (i) => getRowKey(rows[i], i),
  });

  return (
    <div
      ref={v.scrollRef}
      className="relative w-full overflow-auto"
      style={v.enabled ? { maxHeight } : undefined}
      // A scrollable region must be reachable by keyboard so arrow keys and
      // PageUp/PageDown can scroll rows that are not in the DOM yet.
      {...(v.enabled ? { tabIndex: 0, role: 'region', 'aria-label': `${ariaLabel} (scrollable)` } : {})}
    >
      <table
        className={cn('w-full caption-bottom text-sm', className)}
        aria-label={ariaLabel}
        aria-rowcount={rows.length + 1 + footerRowCount}
      >
        <thead className={cn('[&_tr]:border-b', v.enabled && 'sticky top-0 z-10 bg-background')}>
          <tr aria-rowindex={1} className="border-b transition-colors">
            {header}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          <VirtualSpacerRow height={v.paddingTop} colSpan={columnCount} />
          {v.rows.map(({ index, key }) => {
            const row = rows[index];
            return (
              <tr
                key={key}
                {...v.getRowProps(index)}
                aria-rowindex={index + 2}
                className={cn(
                  'border-b transition-colors hover:bg-muted/50',
                  rowClassName?.(row, index)
                )}
              >
                {renderCells(row, index)}
              </tr>
            );
          })}
          <VirtualSpacerRow height={v.paddingBottom} colSpan={columnCount} />
        </tbody>
        {footer ? <tfoot className="border-t font-medium">{footer}</tfoot> : null}
      </table>
    </div>
  );
}

export interface VirtualizedListProps<T> {
  items: T[];
  getItemKey: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => React.ReactNode;
  'aria-label': string;
  estimateItemHeight?: number;
  /** Vertical gap between items in px (applied as padding so it is measured). */
  gap?: number;
  overscan?: number;
  threshold?: number;
  maxHeight?: string;
  className?: string;
}

/** A vertical list of cards that virtualizes above `threshold` items. */
export function VirtualizedList<T>({
  items,
  getItemKey,
  renderItem,
  'aria-label': ariaLabel,
  estimateItemHeight = 160,
  gap = 16,
  overscan = 5,
  threshold,
  maxHeight = DEFAULT_MAX_HEIGHT,
  className,
}: VirtualizedListProps<T>) {
  const v = useVirtualRows({
    count: items.length,
    estimateRowHeight: estimateItemHeight + gap,
    overscan,
    threshold,
    getItemKey: (i) => getItemKey(items[i], i),
  });

  return (
    <div
      ref={v.scrollRef}
      className={cn(v.enabled && 'overflow-auto', className)}
      style={v.enabled ? { maxHeight } : undefined}
      {...(v.enabled ? { tabIndex: 0, role: 'region', 'aria-label': `${ariaLabel} (scrollable)` } : {})}
    >
      <div role="list" aria-label={ariaLabel}>
        {v.paddingTop > 0 && <div aria-hidden="true" style={{ height: v.paddingTop }} />}
        {v.rows.map(({ index, key }) => (
          <div
            key={key}
            {...v.getRowProps(index)}
            role="listitem"
            aria-setsize={items.length}
            aria-posinset={index + 1}
            style={{ paddingTop: index === 0 ? 0 : gap }}
          >
            {renderItem(items[index], index)}
          </div>
        ))}
        {v.paddingBottom > 0 && <div aria-hidden="true" style={{ height: v.paddingBottom }} />}
      </div>
    </div>
  );
}
