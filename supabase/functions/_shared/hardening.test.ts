import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { constantTimeEqual } from './constant-time.ts';
import { ilikeAnyFilter, isSafeIdentifier, quoteFilterValue } from './postgrest-filter.ts';
import * as web from '../../../src/lib/security/postgrestFilter';
import { toPublicChecks } from '../health-check/evaluate.ts';

describe('PostgREST filter quoting (US-358)', () => {
  it('keeps commas and parentheses in a search term inside one quoted value', () => {
    const f = ilikeAnyFilter(['name', 'description'], 'x%,company_id.neq.0),(id.gt.0');
    expect(f).toBe('name.ilike."%x%,company_id.neq.0),(id.gt.0%",description.ilike."%x%,company_id.neq.0),(id.gt.0%"');
  });

  it('escapes quotes and backslashes so the value cannot close its own quotes', () => {
    expect(quoteFilterValue('a"b\\c')).toBe('"a\\"b\\\\c"');
  });

  it('refuses a column name that is not a plain identifier', () => {
    expect(() => ilikeAnyFilter(['name,id.gt.0'], 'x')).toThrow();
    expect(isSafeIdentifier('client_name')).toBe(true);
    expect(isSafeIdentifier('users;drop')).toBe(false);
    expect(isSafeIdentifier('Name')).toBe(false);
  });

  it('the web copy behaves the same as the edge copy', () => {
    for (const term of ['plain', 'a,b', 'q"uote', 'back\\slash', '(paren)']) {
      expect(web.ilikeAnyFilter(['name'], term)).toBe(ilikeAnyFilter(['name'], term));
    }
  });

  it.each([
    ['src/services/taskService.ts'],
    ['src/services/projectService.ts'],
    ['supabase/functions/analyze-support-ticket/index.ts'],
  ])('%s no longer interpolates into .or()', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).not.toMatch(/\.or\(`[^`]*\$\{/);
    expect(src).toContain('ilikeAnyFilter(');
  });

  it('generate-custom-report checks table, filter and sort names', () => {
    const src = readFileSync('supabase/functions/generate-custom-report/index.ts', 'utf8');
    expect(src.match(/isSafeIdentifier\(/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe('constantTimeEqual (US-358)', () => {
  it('compares correctly', () => {
    expect(constantTimeEqual('s3cret', 's3cret')).toBe(true);
    expect(constantTimeEqual('s3cret', 's3creT')).toBe(false);
    expect(constantTimeEqual('s3cret', 's3cre')).toBe(false);
    expect(constantTimeEqual('', 'x')).toBe(false);
  });

  it('create-root-admin uses it instead of !==', () => {
    const src = readFileSync('supabase/functions/create-root-admin/index.ts', 'utf8');
    expect(src).toContain('constantTimeEqual(adminCreationSecret, expectedSecret)');
    expect(src).not.toContain('adminCreationSecret !== expectedSecret');
  });
});

describe('health-check public body (US-358)', () => {
  it('drops dependency error text', () => {
    const out = toPublicChecks({
      database: { status: 'degraded', responseTime: 12, error: 'connect ECONNREFUSED 10.0.3.7:5432' },
      auth: { status: 'healthy', responseTime: 3 },
    });
    expect(out).toEqual({ database: { status: 'degraded', responseTime: 12 }, auth: { status: 'healthy', responseTime: 3 } });
    expect(JSON.stringify(out)).not.toContain('10.0.3.7');
  });
});
