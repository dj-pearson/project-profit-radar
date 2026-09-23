import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * US-400: scripts/check-eslint-warnings.mjs fails on any eslint error and
 * holds the warning count exactly at .github/eslint-warning-baseline.txt.
 *
 * Driven with a prepared `eslint -f json` report (the script's second mode),
 * so no test spends 50s linting the real tree. The last two cases put a fake
 * `npx` on PATH to check that a run which never finished is not read as a
 * count.
 */
const SCRIPT = join(process.cwd(), 'scripts/check-eslint-warnings.mjs');
const BASELINE = parseInt(
  readFileSync(join(process.cwd(), '.github/eslint-warning-baseline.txt'), 'utf8').trim(),
  10
);

type Msg = { severity: 1 | 2; ruleId: string; line: number; column: number; message: string };

function report(warnings: number, errors = 0) {
  const messages: Msg[] = [];
  for (let i = 0; i < warnings; i++) {
    messages.push({ severity: 1, ruleId: 'no-console', line: i + 1, column: 1, message: 'w' });
  }
  for (let i = 0; i < errors; i++) {
    messages.push({ severity: 2, ruleId: 'no-undef', line: 1, column: 1, message: "'x' is not defined." });
  }
  return [{ filePath: join(process.cwd(), 'src/fake.ts'), messages }];
}

function run(data: unknown) {
  const dir = mkdtempSync(join(tmpdir(), 'eslint-ratchet-'));
  const p = join(dir, 'report.json');
  writeFileSync(p, JSON.stringify(data));
  return spawnSync(process.execPath, [SCRIPT, p], { encoding: 'utf8' });
}

function runWithFakeNpx(body: string) {
  const dir = mkdtempSync(join(tmpdir(), 'eslint-ratchet-npx-'));
  const shim = join(dir, 'npx');
  writeFileSync(shim, `#!/bin/sh\n${body}\n`);
  chmodSync(shim, 0o755);
  return spawnSync(process.execPath, [SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
  });
}

describe('check-eslint-warnings', () => {
  it('passes at exactly the baseline with no errors', () => {
    const r = run(report(BASELINE));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(`warnings: ${BASELINE} (baseline ${BASELINE})`);
  });

  it('fails when warnings go above the baseline', () => {
    const r = run(report(BASELINE + 2));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('2 new eslint warning(s)');
  });

  it('fails when warnings drop, asking for the baseline to be lowered', () => {
    const r = run(report(BASELINE - 3));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(`warnings dropped to ${BASELINE - 3}`);
  });

  it('fails on any error even with warnings on the baseline, and names it', () => {
    const r = run(report(BASELINE, 1));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('1 eslint error(s)');
    expect(r.stderr).toContain('src/fake.ts:1:1');
  });

  it('refuses an empty report instead of counting zero warnings', () => {
    const r = run([]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('zero files');
    expect(r.stderr).not.toContain('warnings dropped');
  });

  it('refuses a run eslint did not finish (exit 2: config error or crash)', () => {
    const r = runWithFakeNpx('echo "Oops! Something went wrong!" >&2; exit 2');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('did not complete');
    expect(r.stderr).not.toContain('warnings dropped');
  });

  it('refuses a run killed by the OS', () => {
    const r = runWithFakeNpx('kill -9 $$');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('did not complete');
  });
});
