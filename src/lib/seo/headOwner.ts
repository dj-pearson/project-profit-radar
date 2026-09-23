import { useLayoutEffect, useSyncExternalStore } from 'react';

/**
 * Who owns the page-identity head tags (title, description, keywords,
 * canonical, robots, og:*, twitter:*) on the current route.
 *
 * Two Helmet renderers used to emit them at once: UnifiedSEOSystem, mounted
 * globally in App.tsx, and PageSEO inside the page. react-helmet-async resolves
 * duplicates by mount order, and both sit behind lazy imports (plus a Supabase
 * fetch in UnifiedSEOSystem), so which title and description survived varied
 * from load to load (US-409).
 *
 * The rule now: a page that renders PageSEO owns those tags. UnifiedSEOSystem
 * is the fallback for routes that say nothing about themselves, and stands down
 * while any page holds a claim. dc.* and citation_* stay with
 * AutoSchemaInjector, which PageSEO does not emit.
 */

let claims = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => claims > 0;

/** Called by page-level SEO components for as long as they are mounted. */
export function useClaimPageHead(): void {
  // Layout effect so the site-wide fallback stands down in the same commit the
  // page mounts, before the browser paints a frame with both sets of tags.
  useLayoutEffect(() => {
    claims += 1;
    emit();
    return () => {
      claims -= 1;
      emit();
    };
  }, []);
}

/** True while some page on screen owns its own identity tags. */
export function usePageHeadClaimed(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
