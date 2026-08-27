import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * US-212 / US-258. The TypeScript ratchet's baseline sat at 1860 while the real
 * count was 669, so the gate had been permitting 1191 new errors. It drifted
 * because a count *below* the ceiling only printed a suggestion: every fix
 * since the baseline was written widened the hole instead of closing it.
 *
 * The baseline is now an equality, matching how every other baseline under
 * scripts/ works: fixing errors and not recording it fails just as loudly as
 * adding them.
 *
 * These cases read the script rather than run it, because a real tsc pass takes
 * minutes. CI runs the script itself in the Type Check job.
 */

const SCRIPT = 'scripts/check-ts-error-budget.mjs';
const BASELINE_FILE = '.github/ts-error-baseline.txt';

/** Strip comments. The header warns about `-p tsconfig.json`, and a check must not forbid naming what it warns about. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

/** tsconfig files are JSONC. */
function readJsonc(path: string): Record<string, any> {
  const raw = readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(raw);
}

describe('the TypeScript error baseline', () => {
  it('is a plain integer', () => {
    const raw = readFileSync(BASELINE_FILE, 'utf8').trim();
    expect(raw).toMatch(/^\d+$/);
    expect(Number.parseInt(raw, 10)).toBeGreaterThanOrEqual(0);
  });

  it('is not the stale 1860 ceiling that let 1191 errors through', () => {
    expect(Number.parseInt(readFileSync(BASELINE_FILE, 'utf8').trim(), 10)).toBeLessThan(1860);
  });
});

describe('the ratchet', () => {
  const src = readFileSync(SCRIPT, 'utf8');

  it('fails when the count is above the baseline', () => {
    expect(src).toMatch(/if \(count > baseline\) \{[\s\S]*?process\.exit\(1\)/);
  });

  it('also fails when the count is below it, so progress has to be recorded', () => {
    // This is the half that was missing. Below-baseline printed a notice, and a
    // ceiling nobody lowers stops being a gate.
    expect(src).toMatch(/if \(count < baseline\) \{[\s\S]*?process\.exit\(1\)/);
  });

  it('typechecks the app project, not the solution file', () => {
    // tsconfig.json is `"files": []` plus project references, so
    // `tsc --noEmit -p tsconfig.json` compiles zero source files and reports
    // zero errors regardless of what is in src/.
    const code = stripComments(src);
    expect(code).toContain('tsconfig.app.json');
    expect(code).not.toMatch(/-p tsconfig\.json/);
  });

  it('says so in the header, because running it by hand is the easy mistake', () => {
    const prose = src.replace(/\n\s*\*\s*/g, ' ');
    expect(prose).toContain('compiles zero source files');
  });
});

describe('the root tsconfig really is a solution file', () => {
  it('has an empty files list and project references', () => {
    // If this ever changes, the warning above is wrong and should be removed.
    const root = readJsonc('tsconfig.json');
    expect(root.files).toEqual([]);
    expect(Array.isArray(root.references)).toBe(true);
    expect(root.references.length).toBeGreaterThan(0);
  });

  it('and tsconfig.app.json is the one with strict on', () => {
    const app = readJsonc('tsconfig.app.json');
    expect(app.compilerOptions.strict).toBe(true);
    expect(app.compilerOptions.strictNullChecks).toBe(true);
    expect(app.include).toContain('src');
  });
});
