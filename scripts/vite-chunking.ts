/**
 * US-388: chunk assignment for the production build, and a guard that keeps
 * the heavy vendor chunks out of the landing page's initial load.
 *
 * Why the guard exists: Rollup pulls every module that a manual chunk depends
 * on, and that nothing else claimed, into that manual chunk. Vite's own
 * `vite/preload-helper` (used by every lazy `import()`) and Babel's `extends`
 * helper were first reached through three.js and recharts, so they landed in
 * the `three` and `recharts` chunks. The entry chunk imports both helpers, so
 * index.html modulepreloaded 241 KB gz of three.js and 130 KB gz of recharts
 * on every marketing route, although Hero3D and every chart load lazily.
 *
 * Kept free of node/vite imports so vitest can exercise it directly.
 */

/** Chunks that must only ever be reached through a dynamic import(). */
export const LAZY_ONLY_CHUNKS = ['three', 'recharts', 'xlsx'] as const;

/** Manual chunk names that get a stable `assets/<name>-[hash].js` filename. */
export const MANUAL_CHUNK_NAMES = ['framework', 'ui-library', 'query', 'xlsx', 'three', 'recharts'];

// Tiny runtime helpers shared by the entry and by the lazy vendor chunks.
// They go in `framework` (always loaded) so no lazy chunk can capture them.
const SHARED_RUNTIME_HELPERS = [
  'vite/preload-helper',
  'commonjsHelpers',
  'node_modules/@babel/runtime/',
];

export function manualChunkFor(id: string): string | undefined {
  const normalized = id.replace(/\\/g, '/');

  if (SHARED_RUNTIME_HELPERS.some((h) => normalized.includes(h))) {
    return 'framework';
  }
  // Framework chunk: React + ReactDOM + React Router must stay together
  if (
    normalized.includes('node_modules/react/') ||
    normalized.includes('node_modules/react-dom/') ||
    normalized.includes('node_modules/react-router-dom/') ||
    normalized.includes('node_modules/react-router/') ||
    normalized.includes('node_modules/scheduler/')
  ) {
    return 'framework';
  }
  // UI library chunk: Radix UI + CVA
  if (
    normalized.includes('node_modules/@radix-ui/') ||
    normalized.includes('node_modules/class-variance-authority')
  ) {
    return 'ui-library';
  }
  // Query chunk: TanStack Query
  if (normalized.includes('node_modules/@tanstack/')) {
    return 'query';
  }
  // XLSX chunk: heavy spreadsheet library
  if (normalized.includes('node_modules/xlsx/')) {
    return 'xlsx';
  }
  // Three.js chunk: 3D rendering
  if (normalized.includes('node_modules/three/') || normalized.includes('node_modules/@react-three/')) {
    return 'three';
  }
  // Recharts chunk: charting lib + its d3/victory deps. Isolating it keeps
  // charts out of route chunks that never render one (US-218).
  if (
    normalized.includes('node_modules/recharts/') ||
    normalized.includes('node_modules/recharts-scale/') ||
    normalized.includes('node_modules/victory-vendor/') ||
    normalized.includes('node_modules/d3-')
  ) {
    return 'recharts';
  }
  return undefined;
}

/** The subset of a Rollup output chunk the guard reads. */
export interface ChunkLike {
  type: 'chunk' | 'asset';
  name?: string;
  fileName: string;
  isEntry?: boolean;
  imports?: string[];
}

/**
 * Returns the names of lazy-only chunks reachable from an entry chunk through
 * static imports. Anything in that set ends up modulepreloaded by index.html.
 */
export function findEagerLazyOnlyChunks(
  bundle: Record<string, ChunkLike>,
  lazyOnly: readonly string[] = LAZY_ONLY_CHUNKS,
): string[] {
  const byFile = new Map<string, ChunkLike>();
  for (const item of Object.values(bundle)) {
    if (item.type === 'chunk') byFile.set(item.fileName, item);
  }

  const seen = new Set<string>();
  const stack = [...byFile.values()].filter((c) => c.isEntry).map((c) => c.fileName);
  while (stack.length > 0) {
    const file = stack.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const dep of byFile.get(file)?.imports ?? []) stack.push(dep);
  }

  const hits = new Set<string>();
  for (const file of seen) {
    const name = byFile.get(file)?.name;
    if (name && lazyOnly.includes(name)) hits.add(name);
  }
  return [...hits].sort();
}
