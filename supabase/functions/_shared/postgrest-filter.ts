/**
 * Edge-function copy of src/lib/security/postgrestFilter.ts (US-358); see
 * that file for why. Kept dependency-free so vitest can load it.
 */

export function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function ilikeAnyFilter(columns: readonly string[], term: string): string {
  for (const c of columns) {
    if (!isSafeIdentifier(c)) throw new Error(`Unsafe column name in filter: ${c}`);
  }
  const quoted = quoteFilterValue(`%${term}%`);
  return columns.map((c) => `${c}.ilike.${quoted}`).join(',');
}

export function isSafeIdentifier(name: unknown): name is string {
  return typeof name === 'string' && /^[a-z_][a-z0-9_]{0,62}$/.test(name);
}
