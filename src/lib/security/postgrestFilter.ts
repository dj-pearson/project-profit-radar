/**
 * Safe building blocks for PostgREST filter strings (US-358).
 *
 * .or() takes one string that PostgREST parses: commas separate conditions,
 * parentheses group them, a dot separates column, operator and value. Pasting
 * a search term into that string lets the term add conditions of its own:
 * "x%,company_id.neq.00000000-..." turns one ILIKE into two. RLS still bounds
 * what comes back, but the query is no longer the one the code meant.
 *
 * PostgREST accepts a double-quoted value in these strings, with backslash
 * escaping " and \ inside it, so a quoted value is read as data whatever it
 * contains.
 *
 * Mirrored for edge functions in supabase/functions/_shared/postgrest-filter.ts.
 */

/** Wrap a value so PostgREST reads it as one literal inside .or()/.and(). */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** `col1.ilike."%term%",col2.ilike."%term%"` for a free-text search box. */
export function ilikeAnyFilter(columns: readonly string[], term: string): string {
  for (const c of columns) {
    if (!isSafeIdentifier(c)) throw new Error(`Unsafe column name in filter: ${c}`);
  }
  const quoted = quoteFilterValue(`%${term}%`);
  return columns.map((c) => `${c}.ilike.${quoted}`).join(',');
}

/** A plain SQL identifier: what a table or column name taken from input must look like. */
export function isSafeIdentifier(name: unknown): name is string {
  return typeof name === 'string' && /^[a-z_][a-z0-9_]{0,62}$/.test(name);
}
