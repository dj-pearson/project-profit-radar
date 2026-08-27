import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * US-272. Edge functions import straight from URLs, so there is no lockfile and
 * nothing fails when a dependency moves.
 *
 * The version skew mattered more than it looks. Deno keys module instances by
 * resolved specifier, so npm:zod@3 and https://deno.land/x/zod@v3.22.4/mod.ts
 * were two module graphs with two distinct ZodError classes.
 * _shared/validation.ts checked `error instanceof z.ZodError` against the npm:
 * copy while all nine of its callers built their schemas with the deno.land
 * copy, so the check was false on every request and a validation failure on
 * setup-mfa, verify-mfa-setup, verify-mfa-login, any of the four sso-*
 * endpoints, create-stripe-checkout or process-invoice-payment answered
 * 'Invalid request format' instead of naming the field.
 *
 * These cases run under vitest, so they read the tree rather than importing it -
 * the functions themselves import Deno globals and remote URLs. The enforcement
 * is scripts/check-deno-imports.mjs, in pre-commit and CI; what is pinned here
 * is the specific shape that caused the bug.
 */

const FUNCTIONS = 'supabase/functions';
const MAP = JSON.parse(readFileSync(join(FUNCTIONS, 'deno.json'), 'utf8'));

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

const FILES = walk(FUNCTIONS);

/** Module specifiers only, so a URL in a string literal is not a dependency. */
function specifiersIn(src: string): string[] {
  const out: string[] = [];
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*)['"]((?:npm:|https:\/\/)[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

const ALL = FILES.flatMap((f) => specifiersIn(readFileSync(f, 'utf8')).map((spec) => ({ f, spec })));

describe('remote dependencies', () => {
  it('finds imports at all, so a silent zero is not a pass', () => {
    expect(ALL.length).toBeGreaterThan(100);
  });

  it('are all pinned to a full version', () => {
    const floating = ALL.filter(({ spec }) => !/@v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:$|[/?])/.test(spec));
    expect(floating.map((x) => `${x.f}: ${x.spec}`)).toEqual([]);
  });

  it.each(Object.entries(MAP.imports as Record<string, string>))(
    '%s resolves to exactly one specifier everywhere',
    (_alias, target) => {
      const version = target.match(/@v?\d+\.\d+\.\d+/)?.[0];
      expect(version, `${target} carries no version`).toBeTruthy();
      const pkgPrefix = target.slice(0, target.indexOf(version!));
      const used = new Set(
        ALL.map((x) => x.spec).filter((s) => s.startsWith(pkgPrefix)).map((s) => s.slice(0, s.indexOf(version!) + version!.length)),
      );
      expect([...used].sort()).toEqual([target.slice(0, pkgPrefix.length + version!.length)]);
    },
  );

  it('never loads one package through two loaders', () => {
    // npm:zod@3 and deno.land/x/zod are the same package and two module graphs.
    // This is the shape the instanceof bug came from, and it is invisible in the
    // source of either file.
    const byPackage = new Map<string, Set<string>>();
    for (const { spec } of ALL) {
      let pkg: string | null = null;
      let m: RegExpMatchArray | null;
      if ((m = spec.match(/^npm:(@[^/@]+\/[^/@]+|[^/@]+)/))) pkg = m[1];
      else if ((m = spec.match(/^https:\/\/esm\.sh\/(@[^/@]+\/[^/@]+|[^/@]+)/))) pkg = m[1];
      else if (/^https:\/\/deno\.land\/std@/.test(spec)) pkg = 'std';
      else if ((m = spec.match(/^https:\/\/deno\.land\/x\/([^/@]+)/))) pkg = m[1];
      if (!pkg) continue;
      const loader = spec.startsWith('npm:') ? 'npm' : spec.split('/').slice(0, 3).join('/');
      if (!byPackage.has(pkg)) byPackage.set(pkg, new Set());
      byPackage.get(pkg)!.add(loader);
    }
    const split = [...byPackage].filter(([, loaders]) => loaders.size > 1);
    expect(split.map(([pkg, l]) => `${pkg}: ${[...l].join(' + ')}`)).toEqual([]);
  });
});

describe('the shared zod consumers', () => {
  const CONSUMERS = ['validation.ts', 'validate-body.ts'].map((f) => join(FUNCTIONS, '_shared', f));

  it.each(CONSUMERS)('%s uses the mapped zod', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).toContain(MAP.imports.zod);
    expect(src).not.toContain('npm:zod');
  });

  it('every caller of validateRequest imports the same zod as validation.ts', () => {
    // validation.ts does `error instanceof z.ZodError`. A caller whose schema
    // came from a different zod instance throws a different class and gets the
    // generic 'Invalid request format' branch instead of the field message.
    const validationZod = specifiersIn(readFileSync(join(FUNCTIONS, '_shared', 'validation.ts'), 'utf8'))
      .find((s) => s.includes('zod'));
    expect(validationZod).toBeTruthy();

    const callers = FILES.filter((f) => /\bvalidateRequest\s*\(/.test(readFileSync(f, 'utf8')) && !f.endsWith('_shared/validation.ts'));
    expect(callers.length, 'no validateRequest callers found, so this proves nothing').toBeGreaterThan(5);

    const wrong = callers.filter((f) => {
      const zod = specifiersIn(readFileSync(f, 'utf8')).find((s) => s.includes('zod'));
      return zod !== undefined && zod !== validationZod;
    });
    expect(wrong).toEqual([]);
  });
});

describe('the two AI services', () => {
  it('no longer calls one of them "v2", which reads as the successor it is not', () => {
    expect(() => statSync(join(FUNCTIONS, '_shared', 'ai-service-v2.ts'))).toThrow();
    expect(statSync(join(FUNCTIONS, '_shared', 'ai-service-env.ts')).isFile()).toBe(true);
  });

  it('each says which configuration source it reads and who uses it', () => {
    for (const f of ['ai-service.ts', 'ai-service-env.ts']) {
      const head = readFileSync(join(FUNCTIONS, '_shared', f), 'utf8').slice(0, 1200);
      expect(head, `${f} has no header explaining which service it is`).toMatch(
        /ai_model_configurations|Coolify team shared variables/,
      );
    }
  });
});

describe('the single-tenant auth duplicate', () => {
  it('is gone: it was a 294-line copy of auth-helpers that nothing imported', () => {
    // Its only reference was its own usage example. A module named for a
    // tenancy model, sitting beside the real one, is adopted on the strength of
    // its name (US-302).
    expect(() => statSync(join(FUNCTIONS, '_shared', 'auth-helpers-single-tenant.ts'))).toThrow();
    // An import specifier, not a substring: this file names the module in prose
    // and a guard must not forbid naming what it guards against.
    const importers = FILES.filter((f) =>
      /(?:from|import\s*\()\s*['"][^'"]*auth-helpers-single-tenant/.test(readFileSync(f, 'utf8')),
    );
    expect(importers).toEqual([]);
  });
});
