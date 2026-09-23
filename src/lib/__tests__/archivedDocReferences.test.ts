import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Docs moved to docs/archive/ left two dangling references: a toast telling
 * users to "See EMAIL_SYNC_SETUP_GUIDE.md" (a repo file no customer can open,
 * and no longer at the root anyway), and a mobile-app quick start pointing at
 * ../MOBILE_APP_ARCHITECTURE.md.
 */

const root = process.cwd();

describe('references to archived docs', () => {
  it('EmailSyncSetup tells the user what to do, not which repo file to read', () => {
    const src = readFileSync(join(root, 'src/components/crm/EmailSyncSetup.tsx'), 'utf8');
    const descriptions = [...src.matchAll(/description:\s*"([^"]*)"/g)].map((m) => m[1]);
    expect(descriptions.length).toBeGreaterThan(0);
    for (const d of descriptions) expect(d).not.toMatch(/\.md\b/);
  });

  it('every relative doc path in mobile-app/QUICK_START.md resolves', () => {
    const file = join(root, 'mobile-app/QUICK_START.md');
    const text = readFileSync(file, 'utf8');
    const paths = [
      ...[...text.matchAll(/`(\.\.?\/[^`\s]+\.md)`/g)].map((m) => m[1]),
      ...[...text.matchAll(/\]\((\.\.?\/[^)\s#]+\.md)(?:#[^)]*)?\)/g)].map((m) => m[1]),
    ];
    expect(paths).toContain('../docs/archive/MOBILE_APP_ARCHITECTURE.md');
    for (const p of paths) {
      expect(existsSync(resolve(dirname(file), p)), `${p} does not exist`).toBe(true);
    }
  });
});
