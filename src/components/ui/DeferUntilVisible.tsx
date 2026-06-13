import React, { useEffect, useRef, useState } from 'react';

interface DeferUntilVisibleProps {
  children: React.ReactNode;
  /** Shown until the block scrolls into view (defaults to a sized skeleton box). */
  placeholder?: React.ReactNode;
  /** Start rendering a little before fully visible. */
  rootMargin?: string;
  /** Min-height for the placeholder so layout doesn't jump. */
  minHeight?: number | string;
  className?: string;
}

/**
 * Defers rendering of its children until they scroll into view (US-218).
 *
 * Wrapping heavy/offscreen content — e.g. Recharts charts stacked below the
 * fold — means the chart (and the work of mounting Recharts) only happens once
 * the user can actually see it, cutting initial parse/render time on
 * chart-heavy dashboards. Once visible it stays rendered. Falls back to
 * rendering immediately where IntersectionObserver is unavailable (SSR/old
 * browsers).
 */
export function DeferUntilVisible({
  children,
  placeholder,
  rootMargin = '200px',
  minHeight = 300,
  className,
}: DeferUntilVisibleProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible
        ? children
        : placeholder ?? (
            <div
              className="w-full animate-pulse rounded-lg bg-muted"
              style={{ minHeight }}
              aria-hidden="true"
            />
          )}
    </div>
  );
}

export default DeferUntilVisible;
