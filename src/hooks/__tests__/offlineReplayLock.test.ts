import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Structural, not behavioural, and labelled as such: driving two mounted
 * instances of a hook that reads the offline queue and writes to
 * Supabase costs more scaffolding than the assertion is worth. What matters is
 * that the guard is module-scoped and released in a finally.
 *
 * Why it exists: the old guard was `offlineState.syncInProgress`, which is
 * per-instance. Five capture screens use this hook and SyncQueueIndicator is
 * mounted on every page, so two instances could read the same queued item and
 * insert it twice - two safety incidents, two time entries, nothing to tell
 * them apart afterwards.
 */
const source = readFileSync(join(process.cwd(), 'src/hooks/useOfflineSync.ts'), 'utf8');

describe('offline replay lock', () => {
  it('is module-scoped, not per-hook-instance', () => {
    expect(source).toMatch(/^let replayInFlight = false;$/m);
    // Declared outside the hook, so every instance shares it.
    expect(source.indexOf('let replayInFlight')).toBeLessThan(
      source.indexOf('export const useOfflineSync')
    );
  });

  it('is checked before a replay starts', () => {
    const replay = source.slice(source.indexOf('export async function replayOfflineQueue'));
    expect(replay).toMatch(/^\s*if \(replayInFlight \|\| !navigator\.onLine\) return null;\s*replayInFlight = true;/m);
  });

  it('is released in a finally, so a throw cannot wedge every later replay', () => {
    const replay = source.slice(source.indexOf('export async function replayOfflineQueue'));
    const body = replay.slice(0, replay.indexOf('export const useOfflineSync'));
    expect(body).toMatch(/\}\s*finally\s*\{[\s\S]*replayInFlight = false;[\s\S]*\}/);
  });
});
