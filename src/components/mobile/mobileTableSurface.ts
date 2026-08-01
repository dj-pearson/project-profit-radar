/**
 * Surface resolution for the mobile table/list family (US-143).
 *
 * Kept out of `MobileTable.tsx` so that file only exports components (React
 * Fast Refresh) and so the contrast audit can import the rule without pulling
 * in JSX. See docs/MOBILE_GLASS_GUIDELINES.md for the decision matrix.
 */

/**
 * Surface treatment for table/list rows.
 *
 * `auto` (the default) applies the guideline rule mechanically: dense data —
 * 5 or more visible columns — renders solid because glass hurts scannability at
 * high information density; anything sparser keeps the glass look.
 */
export type MobileTableSurface = 'auto' | 'glass' | 'solid';

/** Column count at or above which `auto` resolves to a solid surface. */
export const DENSE_COLUMN_THRESHOLD = 5;

export const ROW_SURFACE_CLASSES: Record<Exclude<MobileTableSurface, 'auto'>, string> = {
  glass: 'glass shadow-ios-1 border-transparent',
  solid: 'bg-card border border-border shadow-ios-1',
};

export const LIST_SURFACE_CLASSES: Record<Exclude<MobileTableSurface, 'auto'>, string> = {
  glass: 'glass-thin divide-white/10 dark:divide-white/5',
  solid: 'bg-card border border-border divide-border',
};

export function resolveTableSurface(
  surface: MobileTableSurface,
  visibleColumnCount: number
): Exclude<MobileTableSurface, 'auto'> {
  if (surface !== 'auto') return surface;
  return visibleColumnCount >= DENSE_COLUMN_THRESHOLD ? 'solid' : 'glass';
}
