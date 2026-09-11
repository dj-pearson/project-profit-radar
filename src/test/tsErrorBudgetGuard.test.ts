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

  it('refuses a run that exits with errors but reports none', () => {
    // Incoherent: status 1 means tsc found errors, so parsing zero of them
    // means the output was truncated or swallowed.
    const r = runWithFakeTsc('exit 1');

    expect(r.status).toBe(1);
    expect(r.stderr).toContain('did not complete');
  });

  it('still counts a genuine source diagnostic', () => {
    const r = runWithFakeTsc(
      'echo "src/thing.ts(3,5): error TS2322: Type mismatch."; exit 1'
    );

    // One error against a baseline in the thousands: a regression report, not
    // an abort. What matters is that it measured rather than bailing out.
    expect(r.stdout).toContain('TypeScript errors: 1');
    expect(r.stderr).not.toContain('did not complete');
  });
});
