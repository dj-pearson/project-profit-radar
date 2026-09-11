import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The guard has to tell "tsc found no errors" apart from "tsc never finished".
 *
 * It once could not: an out-of-memory kill produces the single word "Killed",
 * no diagnostics and no config error, so the count came out 0 and the script
 * printed "BELOW the baseline by 1660 ... set it to 0". Acting on that would
 * have disabled the gate permanently while looking like the largest cleanup in
 * the project's history.
 *
 * Driven by putting a fake `npx` ahead of the real one on PATH, so the real
 * script runs unmodified.
 */
const SCRIPT = join(process.cwd(), 'scripts/check-ts-error-budget.mjs');

function runWithFakeTsc(body: string) {
  const dir = mkdtempSync(join(tmpdir(), 'tsbudget-'));
  const shim = join(dir, 'npx');
  writeFileSync(shim, `#!/bin/sh\n${body}\n`);
  chmodSync(shim, 0o755);
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
  });
}

describe('check-ts-error-budget', () => {
  it('refuses to treat an out-of-memory kill as zero errors', () => {
    const r = runWithFakeTsc('echo "Killed" >&2; exit 137');

    expect(r.status).toBe(1);
    expect(r.stderr).toContain('did not complete');
    expect(r.stderr).not.toContain('BELOW the baseline');
    // The number from a dead run must never be offered as a new baseline.
    expect(r.stderr).not.toMatch(/set .*ts-error-baseline\.txt to 0/);
  });

  it('refuses a run that exits nonzero but reports nothing', () => {
    // Incoherent: a nonzero status means tsc had something to say, so parsing
    // none of it means the output was truncated or swallowed.
    const r = runWithFakeTsc('exit 2');

    expect(r.status).toBe(1);
    expect(r.stderr).toContain('did not complete');
  });

  it('accepts exit status 2, which is what tsc returns when it reports errors', () => {
    // The first cut of this guard allowed only 0 and 1 and would have failed
    // the Type Check job on every push. tsc: 0 clean, 2 diagnostics reported.
    const r = runWithFakeTsc(
      'echo "src/thing.ts(3,5): error TS2322: Type mismatch."; exit 2'
    );

    expect(r.stdout).toContain('TypeScript errors: 1');
    expect(r.stderr).not.toContain('did not complete');
  });

  it('still counts a genuine source diagnostic on status 1', () => {
    const r = runWithFakeTsc(
      'echo "src/thing.ts(3,5): error TS2322: Type mismatch."; exit 1'
    );

    expect(r.stdout).toContain('TypeScript errors: 1');
    expect(r.stderr).not.toContain('did not complete');
  });
});
