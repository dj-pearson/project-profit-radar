import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * payment-reminders built its success responses in top-level helpers that
 * spread `corsHeaders`, a const that only exists inside the serve() callback.
 * Every successful action threw a ReferenceError and came back as a 500.
 *
 * Read the source rather than run it: it is a Deno module with remote imports.
 * The check is mechanical: a top-level function that reads corsHeaders must
 * take it as a parameter.
 */

const FILE = 'supabase/functions/payment-reminders/index.ts';

function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

/** Top-level `function name(params) { ... }` blocks, split at the column-0 closing brace. */
function topLevelFunctions(src: string): Array<{ name: string; params: string; body: string }> {
  const out: Array<{ name: string; params: string; body: string }> = [];
  const re = /^(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)[^{]*\{/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length;
    const end = src.indexOf('\n}', start);
    out.push({ name: m[1], params: m[2], body: src.slice(start, end === -1 ? undefined : end) });
  }
  return out;
}

describe('payment-reminders CORS scoping', () => {
  const src = code(FILE);
  const fns = topLevelFunctions(src);

  it('finds the three action helpers', () => {
    const names = fns.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining(['checkPendingReminders', 'sendReminder', 'generateReminders']));
  });

  it('every top-level helper that uses corsHeaders receives it as a parameter', () => {
    const users = fns.filter((f) => /\bcorsHeaders\b/.test(f.body));
    expect(users.length).toBeGreaterThanOrEqual(3);
    for (const f of users) {
      expect(f.params, `${f.name} reads corsHeaders but does not take it`).toMatch(/\bcorsHeaders\b/);
    }
  });

  it('the dispatcher passes the per-request headers to each helper', () => {
    expect(src).toMatch(/checkPendingReminders\([^)]*corsHeaders\)/);
    expect(src).toMatch(/sendReminder\([^)]*corsHeaders\)/);
    expect(src).toMatch(/generateReminders\([^)]*corsHeaders\)/);
  });

  it('does not fall back to the deprecated module-level corsHeaders export', () => {
    expect(src).not.toMatch(/import\s*\{[^}]*\bcorsHeaders\b[^}]*\}/);
  });
});
