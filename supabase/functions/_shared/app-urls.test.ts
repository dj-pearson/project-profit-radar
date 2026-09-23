import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_SITE_URL,
  ENV_ALIASES,
  functionsBaseUrl,
  readEnvWithAliases,
  resetEnvAliasWarnings,
  siteUrl,
} from './app-urls.ts';

const env = (vars: Record<string, string>) => (name: string) => vars[name];

describe('app URL env names (US-392)', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetEnvAliasWarnings();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('prefers the canonical SITE_URL and logs nothing when it is the only one set', () => {
    expect(siteUrl(env({ SITE_URL: 'https://staging.brikly.net/' }))).toBe('https://staging.brikly.net');
    expect(warn).not.toHaveBeenCalled();
  });

  it('keeps a deployment that only has FRONTEND_URL working, and says what to rename', () => {
    expect(siteUrl(env({ FRONTEND_URL: 'https://old.example' }))).toBe('https://old.example');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('FRONTEND_URL is deprecated; set SITE_URL'));
  });

  it('reads APP_URL last and only for its origin, since it held the subscription page URL', () => {
    expect(siteUrl(env({ APP_URL: 'https://brikly.net/subscription' }))).toBe('https://brikly.net');
    expect(siteUrl(env({ FRONTEND_URL: 'https://a.example', APP_URL: 'https://b.example/x' }))).toBe('https://a.example');
  });

  it('falls back to the production default when nothing is set, or an empty string is', () => {
    expect(siteUrl(env({}))).toBe(DEFAULT_SITE_URL);
    expect(siteUrl(env({ SITE_URL: '', APP_URL: 'not a url' }))).toBe(DEFAULT_SITE_URL);
  });

  it('warns once when the canonical name and an alias disagree, and uses the canonical one', () => {
    const get = env({ SITE_URL: 'https://a.example', FRONTEND_URL: 'https://b.example' });
    expect(siteUrl(get)).toBe('https://a.example');
    siteUrl(get);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('Delete FRONTEND_URL');
  });

  it('reads PUBLIC_FUNCTIONS_BASE_URL, then FUNCTIONS_URL, then the caller fallback', () => {
    expect(functionsBaseUrl('https://fallback', env({ PUBLIC_FUNCTIONS_BASE_URL: 'https://f.example/' }))).toBe('https://f.example');
    expect(functionsBaseUrl('https://fallback', env({ FUNCTIONS_URL: 'https://functions.brikly.net' }))).toBe('https://functions.brikly.net');
    expect(functionsBaseUrl('https://fallback', env({}))).toBe('https://fallback');
    expect(functionsBaseUrl('', env({}))).toBe('');
  });

  it('reports which name supplied the value', () => {
    expect(readEnvWithAliases('SITE_URL', env({ APP_URL: 'https://x.example' }))).toEqual({ value: 'https://x.example', name: 'APP_URL' });
    expect(readEnvWithAliases('NOT_ALIASED', env({ NOT_ALIASED: 'v' }))).toEqual({ value: 'v', name: 'NOT_ALIASED' });
  });

  it('declares exactly the two renames the secrets doc lists', () => {
    expect(ENV_ALIASES).toEqual({
      SITE_URL: ['FRONTEND_URL', 'APP_URL'],
      PUBLIC_FUNCTIONS_BASE_URL: ['FUNCTIONS_URL'],
    });
  });
});

describe('callers of the URL helpers', () => {
  // `const siteUrl = siteUrl()` shadows the import and throws a
  // ReferenceError (temporal dead zone) the moment the handler runs.
  it('never shadow the helper they call', async () => {
    const { readFileSync, readdirSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = join(__dirname, '..');
    const offenders: string[] = [];
    for (const dir of readdirSync(root)) {
      const file = join(root, dir, 'index.ts');
      if (!existsSync(file)) continue;
      const src = readFileSync(file, 'utf8');
      if (/\b(?:const|let|var)\s+(siteUrl|functionsBaseUrl)\s*=\s*\1\s*\(/.test(src)) offenders.push(dir);
    }
    expect(offenders).toEqual([]);
  });
});
