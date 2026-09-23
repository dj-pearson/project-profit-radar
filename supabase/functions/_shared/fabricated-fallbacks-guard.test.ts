import { describe, it, expect, beforeAll } from 'vitest';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// The edge half of scripts/check-fabricated-fallbacks.mjs. Imported by path
// so the typed tsconfigs do not have to know about a .mjs script.
type Hit = { line: number; sink: string; text: string };
let findEdgeFabrications: (fileName: string, text: string) => Hit[];

beforeAll(async () => {
  const mod = await import(join(process.cwd(), 'scripts/check-fabricated-fallbacks.mjs'));
  findEdgeFabrications = mod.findEdgeFabrications;
});

const scan = (text: string) => findEdgeFabrications(join(process.cwd(), 'fixture.ts'), text);

describe('fabricated-value guard for edge functions', () => {
  it('catches the old check-keyword-positions shape: random ranking written and returned', () => {
    const hits = scan(`
      const results = [];
      for (const keyword of keywords) {
        let position = null;
        if (!key) position = Math.floor(Math.random() * 50) + 1;
        results.push({ keyword, position });
      }
      const rows = results.map((r) => ({ current_position: r.position }));
      await supabase.from('seo_serp_positions').insert(rows);
      return new Response(JSON.stringify({ success: true, positions: rows }));
    `);
    expect(hits.map((h) => h.sink)).toEqual(['writes it to the database', 'returns it in the response']);
  });

  it('follows a helper that returns a random value', () => {
    const hits = scan(`
      function score() { return 40 + Math.random() * 40; }
      const risk = score();
      return successResponse({ risk });
    `);
    expect(hits).toHaveLength(1);
  });

  it('does not confuse two variables with the same name', () => {
    const hits = scan(`
      function a() { const data = Math.random(); console.log(data); }
      function b(data) { return new Response(JSON.stringify({ success: true, data })); }
    `);
    expect(hits).toEqual([]);
  });

  it('ignores randomness that only chooses: index, shuffle, branch, id, jitter', () => {
    const hits = scan(`
      const i = Math.floor(Math.random() * topics.length);
      const topic = topics[i];
      const inline = topics[Math.floor(Math.random() * topics.length)];
      const order = [...crew].sort(() => Math.random() - 0.5);
      if (Math.random() < rate) mutate();
      const id = Math.random().toString(36).slice(2);
      setTimeout(retry, Math.random() * 1000);
      await supabase.from('seo_backlinks').insert({ topic, inline, order, id });
      return new Response(JSON.stringify({ success: true, topic }));
    `);
    expect(hits).toEqual([]);
  });

  it('passes on the repo with the baseline exact', () => {
    const r = spawnSync(process.execPath, ['scripts/check-fabricated-fallbacks.mjs'], { encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('has no hit left in the fixed functions', async () => {
    const { readFileSync } = await import('node:fs');
    for (const name of ['check-keyword-positions', 'generate-cash-flow-forecast', 'smart-procurement']) {
      const file = join(process.cwd(), 'supabase/functions', name, 'index.ts');
      expect(findEdgeFabrications(file, readFileSync(file, 'utf8'))).toEqual([]);
    }
  });
});
