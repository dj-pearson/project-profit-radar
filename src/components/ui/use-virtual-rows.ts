/**
 * Row-window hook behind VirtualizedTable, VirtualizedList and the
 * virtualized body of AccessibleTable (US-270). See virtual-table.tsx.
 */
import type React from 'react';
import { useCallback, useRef } from 'react';
import { useVirtualizer, observeElementRect, type Virtualizer } from '@tanstack/react-virtual';

/** Row count above which tables virtualize. Below it they render every row. */
export const VIRTUALIZE_THRESHOLD = 100;
const DEFAULT_OVERSCAN = 10;
/**
 * Viewport height assumed while the scroll element reports 0 (before first
 * layout, inside a hidden tab, or in a DOM with no layout). virtual-core
 * renders nothing at all for a 0px viewport; this keeps a first window of
 * rows on screen until the real size arrives from the ResizeObserver.
 */
const FALLBACK_VIEWPORT_HEIGHT = 600;

export interface UseVirtualRowsOptions {
  /** Total number of rows. */
  count: number;
  /** Estimated row height in px, used until a row has been measured. */
  estimateRowHeight?: number;
  /** Rows rendered beyond each edge of the viewport. */
  overscan?: number;
  /** Virtualize only when `count` is greater than this. */
  threshold?: number;
  /** Stable key for the row at `index` (keeps measurements across re-sorts). */
  getItemKey?: (index: number) => React.Key;
}

export interface VirtualRowWindow {
  index: number;
  key: React.Key;
}

export interface VirtualRowsResult {
  /** Attach to the element that scrolls (only needed when `enabled`). */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Whether virtualization is active for the current `count`. */
  enabled: boolean;
  /** Rows to render, in order. Every row when `enabled` is false. */
  rows: VirtualRowWindow[];
  /** Height in px of the space above the first rendered row. */
  paddingTop: number;
  /** Height in px of the space below the last rendered row. */
  paddingBottom: number;
  /** Props for the rendered row element: measurement ref + data-index. */
  getRowProps: (index: number) => { ref?: (el: Element | null) => void; 'data-index': number };
  /** Scroll so row `index` is rendered (no-op when not virtualized). */
  scrollToIndex: (index: number) => void;
  /** The underlying virtualizer, for anything the helpers do not cover. */
  virtualizer: Virtualizer<HTMLDivElement, Element>;
}

export function useVirtualRows({
  count,
  estimateRowHeight = 48,
  overscan = DEFAULT_OVERSCAN,
  threshold = VIRTUALIZE_THRESHOLD,
  getItemKey,
}: UseVirtualRowsOptions): VirtualRowsResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const enabled = count > threshold;

  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count,
    enabled,
    overscan,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    getItemKey,
    observeElementRect: (instance, cb) =>
      observeElementRect(instance, (rect) =>
        cb(rect.height > 0 ? rect : { width: rect.width, height: FALLBACK_VIEWPORT_HEIGHT })
      ),
    // A row that measures 0 (not laid out yet, or a test DOM with no layout)
    // must not collapse to 0px - that would pull every row into the window.
    measureElement: (el) => {
      const h = el.getBoundingClientRect().height;
      return h > 0 ? h : estimateRowHeight;
    },
  });

  const scrollToIndex = useCallback(
    (index: number) => {
      if (enabled) virtualizer.scrollToIndex(index, { align: 'auto' });
    },
    [enabled, virtualizer]
  );

  if (!enabled) {
    const rows = Array.from({ length: count }, (_, index) => ({
      index,
      key: getItemKey ? getItemKey(index) : index,
    }));
    return {
      scrollRef,
      enabled,
      rows,
      paddingTop: 0,
      paddingBottom: 0,
      getRowProps: (index) => ({ 'data-index': index }),
      scrollToIndex,
      virtualizer,
    };
  }

  const items = virtualizer.getVirtualItems();
  const total = virtualizer.getTotalSize();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom = items.length > 0 ? total - items[items.length - 1].end : 0;

  return {
    scrollRef,
    enabled,
    rows: items.map((item) => ({ index: item.index, key: item.key as React.Key })),
    paddingTop,
    paddingBottom: Math.max(0, paddingBottom),
    getRowProps: (index) => ({ ref: virtualizer.measureElement, 'data-index': index }),
    scrollToIndex,
    virtualizer,
  };
}
