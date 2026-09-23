import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Source-reading checks for four fixes: the entry points are Deno serve()
// handlers that vitest cannot import, so the test pins the code shape.

const read = (p: string) => readFileSync(p, 'utf8');
// Drop // and /* */ comments so an explanatory comment can't satisfy or trip a check.
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const before = (src: string, first: string, second: string) => {
  const a = src.indexOf(first);
  const b = src.indexOf(second);
  expect(a, `missing: ${first}`).toBeGreaterThan(-1);
  expect(b, `missing: ${second}`).toBeGreaterThan(-1);
  return a < b;
};

describe('enhanced-blog-ai-simple', () => {
  const src = code('supabase/functions/enhanced-blog-ai-simple/index.ts');

  it('returns and logs no part of CLAUDE_API_KEY', () => {
    expect(src).not.toMatch(/claudeKey\s*\??\.\s*(substring|slice|substr|length)/);
    expect(src).not.toMatch(/claudeKeyPrefix|claudeKeyLength/);
    expect(src).not.toMatch(/stack:\s*error\.stack/);
  });

  it('requires admin or root_admin before any Claude call', () => {
    expect(src).toMatch(/\['admin',\s*'root_admin'\]\.includes\(callerProfile\.role\)/);
    expect(before(src, "['admin', 'root_admin']", 'api.anthropic.com')).toBe(true);
    expect(before(src, "['admin', 'root_admin']", 'validateBody(')).toBe(true);
  });
});

describe('seo-file-generator', () => {
  const src = code('supabase/functions/seo-file-generator/index.ts');

  it('requires root_admin, like save-robots-txt and save-llms-txt', () => {
    expect(src).toMatch(/callerProfile\?\.role !== 'root_admin'/);
    for (const f of ['save-robots-txt', 'save-llms-txt']) {
      expect(code(`supabase/functions/${f}/index.ts`)).toContain("role !== 'root_admin'");
    }
  });

  it('checks the role before it uploads to site-assets', () => {
    expect(before(src, "!== 'root_admin'", ".from('site-assets')")).toBe(true);
  });
});

describe('api-management webhook/test stays internal', () => {
  // components/admin/ApiManagement.tsx, the browser caller the rest of this
  // block used to pin, was deleted in US-296 as an unrouted duplicate of
  // pages/admin/APIKeyManagement.tsx. The edge-function half still holds.
  const fn = code('supabase/functions/api-management/index.ts');

  it('checks for an internal caller before it reads the body', () => {
    const testFn = fn.slice(fn.indexOf('async function testWebhook'));
    expect(testFn.slice(0, testFn.indexOf('validateBody('))).toContain('requireInternalCaller(req)');
  });

  it('has no browser caller', () => {
    expect(code('src/pages/admin/APIKeyManagement.tsx')).not.toContain('webhook/test');
  });
});

describe('social-post-scheduler stays internal and has no browser caller', () => {
  it('keeps requireInternalCaller', () => {
    expect(code('supabase/functions/social-post-scheduler/index.ts')).toContain('requireInternalCaller(req)');
  });

  it('is not invoked from src/', () => {
    for (const f of [
      'src/hooks/useAutomatedSocialPosts.ts',
      'src/components/social-media/AutomatedSocialPosts.tsx',
    ]) {
      const src = code(f);
      expect(src).not.toContain('social-post-scheduler');
      expect(src).not.toContain('triggerManualPost');
    }
  });
});
