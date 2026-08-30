import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * US-241: the four anonymous marketing forms.
 *
 * capture-lead, handle-demo-request, handle-sales-contact and track-referral
 * are reached with no account at all and write between two and five rows each.
 * Three of them took every field straight out of `await req.json()` with a
 * truthiness check on the required ones, into TEXT columns that impose no
 * ceiling of their own. They are converted together rather than one at a time
 * because they write the same `leads` row, and two sibling forms disagreeing
 * about what fits in `first_name` is its own bug.
 *
 * These cases pin the properties that make that true, not the line count.
 */

const FUNCTIONS = {
  'capture-lead': 'supabase/functions/capture-lead/index.ts',
  'handle-demo-request': 'supabase/functions/handle-demo-request/index.ts',
  'handle-sales-contact': 'supabase/functions/handle-sales-contact/index.ts',
  'track-referral': 'supabase/functions/track-referral/index.ts',
} as const;

const src = (name: keyof typeof FUNCTIONS) => readFileSync(FUNCTIONS[name], 'utf8');
/** Source with comments removed, matching what the guard reads. */
const code = (name: keyof typeof FUNCTIONS) =>
  src(name)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
const names = Object.keys(FUNCTIONS) as Array<keyof typeof FUNCTIONS>;

/** `field: z.string().max(N)` -> { field: N }, for whichever schema is in the file. */
function caps(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of text.matchAll(/^\s{2}(\w+):\s*z\.string\(\)[^,\n]*?\.max\((\d+)\)/gm)) {
    out[m[1]] = Number(m[2]);
  }
  return out;
}

describe('the four anonymous marketing forms validate their bodies', () => {
  it.each(names)('%s routes its body through validateBody', (name) => {
    const text = src(name);
    expect(text).toMatch(/await validateBody\(req, \w+Schema, \{ name: '/);
    expect(text).toContain('if (!parsed.ok) return parsed.response;');
  });

  it.each(names)('%s no longer reads req.json() itself', (name) => {
    // validateBody reads the body. A second read would throw on a consumed
    // stream, so a leftover call here is not a stylistic point.
    //
    // Strip comments first, the way scripts/check-edge-input-validation.mjs
    // does. Without that, handle-sales-contact fails on its own header, which
    // says the word req.json() while describing what it no longer does - the
    // same false positive the fake-success guard hit twice.
    expect(code(name)).not.toMatch(/\breq\s*\.\s*json\s*\(\s*\)/);
  });

  it.each(names)('%s bounds the email it writes', (name) => {
    expect(src(name)).toMatch(/z\.string\(\)\.email\(\)\.max\(255\)/);
  });
});

describe('the sibling forms agree on what fits', () => {
  // All four write `leads`. If one caps first_name at 100 and another at 500,
  // the same person gets a different row depending on which form they used.
  const shared = ['firstName', 'lastName', 'companyName', 'phone', 'companySize', 'industry'];

  it.each(shared)('%s has one cap across every form that takes it', (field) => {
    const seen = names
      .map((n) => [n, caps(src(n))[field]] as const)
      .filter(([, v]) => v !== undefined);
    expect(seen.length, `${field} is in no schema at all`).toBeGreaterThan(1);
    const distinct = new Set(seen.map(([, v]) => v));
    expect(
      [...distinct],
      `${field} is capped differently: ${seen.map(([n, v]) => `${n}=${v}`).join(', ')}`,
    ).toHaveLength(1);
  });
});

describe('capture-lead: the schema and the sanitizer cannot drift apart', () => {
  // capture-lead already sanitized every field to a length before this story
  // touched it. The schema restates those lengths, so the risk is that someone
  // changes one and not the other and the declared contract quietly stops
  // describing what the function does.
  const text = src('capture-lead');
  const declared = caps(text);

  /** `sanitizeString(requestData.field, N)` -> { field: N } */
  const sanitized: Record<string, number> = {};
  for (const m of text.matchAll(/sanitizeString\(requestData\.(\w+),\s*(\d+)\)/g)) {
    sanitized[m[1]] = Number(m[2]);
  }

  it('reads a real set of sanitizer calls, so an empty match cannot pass this', () => {
    expect(Object.keys(sanitized).length).toBeGreaterThan(10);
  });

  it.each(Object.keys(sanitized))('%s is capped the same in both places', (field) => {
    expect(declared[field], `${field} is sanitized but not in the schema`).toBe(sanitized[field]);
  });
});

describe('report mode still needs the hand-written required-field checks', () => {
  // INPUT_VALIDATION_MODE defaults to report, where validateBody hands the
  // handler the RAW body on a schema failure. Deleting these because "the
  // schema covers it" would let a blank form write rows until the secret is
  // flipped - which is a deploy nobody has scheduled.
  it.each(['handle-demo-request', 'handle-sales-contact', 'track-referral'] as const)(
    '%s keeps its truthiness check',
    (name) => {
      expect(src(name)).toMatch(/if \(!\w+ \|\| !\w+/);
    },
  );

  it('and validate-body still documents report as the default', () => {
    const helper = readFileSync('supabase/functions/_shared/validate-body.ts', 'utf8');
    expect(helper).toContain('=== "enforce" ? "enforce" : "report"');
  });
});
