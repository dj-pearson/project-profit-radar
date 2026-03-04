/**
 * Security Regression Test Suite (US-014)
 *
 * This is the top-level security gate that:
 *   1. Validates the vulnerability manifest is well-formed.
 *   2. Verifies every referenced regression test file exists on disk.
 *   3. Imports all domain-specific security test suites so they execute
 *      as part of a single `vitest run src/lib/security` pass.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  KNOWN_VULNERABILITIES,
  type KnownVulnerability,
  type VulnerabilitySeverity,
} from '../vulnerabilityManifest';

// ---------------------------------------------------------------------------
// Re-import all security test suites so running `vitest run src/lib/security`
// executes everything as a comprehensive security gate.
// ---------------------------------------------------------------------------
import './sanitize.test';
import './loginProtection.test';
import './csrfProtection.test';
import './rateLimiter.test';
import './trustedTypes.test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VALID_SEVERITIES: VulnerabilitySeverity[] = [
  'critical',
  'high',
  'medium',
  'low',
];

const REQUIRED_FIELDS: (keyof KnownVulnerability)[] = [
  'id',
  'severity',
  'description',
  'affectedFile',
  'fixDate',
  'regressionTestFile',
];

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fileExistsSync(relativePath: string): boolean {
  const absolute = path.join(PROJECT_ROOT, relativePath);
  return fs.existsSync(absolute);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Security Regression Gate (US-014)', () => {
  describe('Vulnerability manifest integrity', () => {
    it('should contain at least 5 known vulnerability entries', () => {
      expect(KNOWN_VULNERABILITIES.length).toBeGreaterThanOrEqual(5);
    });

    it('should have unique vulnerability IDs', () => {
      const ids = KNOWN_VULNERABILITIES.map((v) => v.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it.each(KNOWN_VULNERABILITIES)(
      '$id should have all required fields',
      (vuln: KnownVulnerability) => {
        for (const field of REQUIRED_FIELDS) {
          expect(vuln[field], `Missing field "${field}" on ${vuln.id}`).toBeDefined();
          expect(
            typeof vuln[field] === 'string' && vuln[field].length > 0,
            `Field "${field}" on ${vuln.id} must be a non-empty string`,
          ).toBe(true);
        }
      },
    );

    it.each(KNOWN_VULNERABILITIES)(
      '$id should have a valid severity level',
      (vuln: KnownVulnerability) => {
        expect(VALID_SEVERITIES).toContain(vuln.severity);
      },
    );

    it.each(KNOWN_VULNERABILITIES)(
      '$id should have a valid ISO date in fixDate',
      (vuln: KnownVulnerability) => {
        const parsed = Date.parse(vuln.fixDate);
        expect(isNaN(parsed)).toBe(false);
      },
    );
  });

  describe('Regression test file existence', () => {
    it.each(KNOWN_VULNERABILITIES)(
      '$id regression test file should exist: $regressionTestFile',
      (vuln: KnownVulnerability) => {
        const exists = fileExistsSync(vuln.regressionTestFile);
        if (!exists) {
          console.warn(
            `[SKIP] Regression test file not yet created for ${vuln.id}: ${vuln.regressionTestFile}`,
          );
        }
        // This assertion ensures the referenced file is present. If a test
        // file has not been written yet, the manifest entry should be updated
        // to point to the correct path or the file must be created.
        expect(
          exists,
          `Regression test file "${vuln.regressionTestFile}" referenced by ${vuln.id} does not exist`,
        ).toBe(true);
      },
    );
  });

  describe('Affected source file existence', () => {
    it.each(KNOWN_VULNERABILITIES)(
      '$id affected file should exist: $affectedFile',
      (vuln: KnownVulnerability) => {
        const exists = fileExistsSync(vuln.affectedFile);
        expect(
          exists,
          `Affected file "${vuln.affectedFile}" referenced by ${vuln.id} does not exist`,
        ).toBe(true);
      },
    );
  });

  describe('Severity coverage', () => {
    it('should include at least one critical or high severity entry', () => {
      const criticalOrHigh = KNOWN_VULNERABILITIES.filter(
        (v) => v.severity === 'critical' || v.severity === 'high',
      );
      expect(criticalOrHigh.length).toBeGreaterThanOrEqual(1);
    });
  });
});
