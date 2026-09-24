import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
// @ts-expect-error - plain .mjs guard script, no types
import { classify } from '../../../scripts/check-edge-error-reporting.mjs';

// scripts/check-edge-error-reporting.mjs (US-251). The scanner decides which
// catch is "top-level", so the cases that matter are the ones where a naive
// regex would be fooled: braces in strings and templates, nested catches, a
// handler passed by name, and a copy-pasted fn name.

const bucket = (src: string, name = 'f') => classify(src, name).bucket;

describe('classify', () => {
  it('passes a serve handler whose top-level catch reports under its own name', () => {
    expect(bucket(`
      serve(async (req) => {
        try { await work(); } catch (error) {
          await captureException(error, { fn: 'f', req });
          return new Response('x', { status: 500 });
        }
      });`)).toBe('reported');
  });

  it('fails a top-level catch that only logs', () => {
    expect(bucket(`
      serve(async (req) => {
        try { await work(); } catch (error) { console.error(error); return new Response('x', { status: 500 }); }
      });`)).toBe('unreported');
  });

  it('fails a report filed under another function name', () => {
    expect(bucket(`
      serve(async (req) => {
        try { await work(); } catch (error) { await captureException(error, { fn: 'other', req }); }
      });`)).toBe('unreported');
  });

  it('does not accept a nested catch as the top-level one', () => {
    expect(bucket(`
      serve(async (req) => {
        try {
          for (const r of rows) { try { await one(r); } catch (e) { await captureException(e, { fn: 'f' }); } }
        } catch (error) { return new Response('x', { status: 500 }); }
      });`)).toBe('unreported');
  });

  it('is not fooled by braces and catch text inside strings, templates, comments and regexes', () => {
    expect(bucket(`
      serve(async (req) => {
        const a = "} catch (x) { captureException(";
        const b = \`\${ '{' } } \${ { k: 1 }.k }\`;
        const re = /[{}]\\}/g; // } catch {
        /* } */
        try { await work(a, b, re); } catch (error) { console.error(error); }
      });`)).toBe('unreported');
  });

  it('finds a handler passed to serve by name', () => {
    expect(bucket(`
      const handler = async (req: Request): Promise<Response> => {
        try { return await work(); } catch (error) { await captureException(error, { fn: 'f', req }); return x; }
      };
      serve(handler);`)).toBe('reported');
  });

  it('finds a default-export handler', () => {
    expect(bucket(`
      export default async function handler(req: Request): Promise<Response> {
        try { return await work(); } catch (error) { return x; }
      }`)).toBe('unreported');
  });

  it('reports no-catch for a handler with no top-level try', () => {
    expect(bucket(`serve(async (req) => { return await work(); });`)).toBe('no-catch');
  });

  it('accepts withErrorReporting as coverage for a handler without a catch-all', () => {
    expect(bucket(`
      serve(withErrorReporting('f', async (req) => {
        let raw; try { raw = await req.json(); } catch { return bad(); }
        return await work(raw);
      }));`)).toBe('reported');
  });

  it('still requires a report in the catch-all of a wrapped handler, which the wrapper never sees', () => {
    expect(bucket(`
      serve(withErrorReporting('f', async (req) => {
        try { return await work(); } catch (error) { return new Response('x', { status: 500 }); }
      }));`)).toBe('unreported');
  });

  it('fails a wrapper named for another function', () => {
    expect(bucket(`serve(withErrorReporting('other', async (req) => { return await work(); }));`)).toBe('unreported');
  });

  it('reports no-handler for a shape it does not know', () => {
    expect(bucket(`addEventListener('fetch', (e) => e.respondWith(go()));`)).toBe('no-handler');
  });
});

describe('the repository', () => {
  it('matches the exact baseline', () => {
    const root = join(__dirname, '..', '..', '..');
    const r = spawnSync(process.execPath, [join(root, 'scripts', 'check-edge-error-reporting.mjs')], { encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });
});
