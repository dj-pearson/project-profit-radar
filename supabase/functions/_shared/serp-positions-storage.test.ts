import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  estimateCtr,
  mergeSavedPositions,
  SERP_POSITION_COLUMNS,
  toPositionRecord,
  toSerpFeaturesRow,
  toSerpPositionRow,
} from './keyword-positions.ts';
import { pickSiteId, resolveSeoSiteId } from './seo-site.ts';

const root = process.cwd();
const migrationsDir = join(root, 'supabase/migrations');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

/** Columns of seo_serp_positions as the migration history defines them. */
function migrationColumns(): Set<string> {
  const cols = new Set<string>();
  for (const f of readdirSync(migrationsDir).filter((n) => n.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migrationsDir, f), 'utf8');
    const create = sql.match(/CREATE TABLE IF NOT EXISTS public\.seo_serp_positions \(([\s\S]*?)\n\);/);
    if (create) {
      for (const line of create[1].split('\n')) {
        const m = line.trim().match(/^([a-z_]+)\s+(UUID|TEXT|INTEGER|BOOLEAN|JSONB|DECIMAL|TIMESTAMP)/);
        if (m) cols.add(m[1]);
      }
    }
    for (const m of sql.matchAll(/ALTER TABLE public\.seo_serp_positions ADD COLUMN (?:IF NOT EXISTS )?([a-z_]+)/g)) {
      cols.add(m[1]);
    }
  }
  return cols;
}

describe('seo_serp_positions: rows use columns the table has', () => {
  const cols = migrationColumns();

  it('reads the table definition, site_id included', () => {
    for (const c of ['keyword', 'position', 'url', 'location', 'device', 'site_id', 'has_featured_snippet']) {
      expect(cols.has(c), c).toBe(true);
    }
    for (const c of ['current_position', 'ranking_url', 'domain', 'country', 'search_volume', 'serp_features']) {
      expect(cols.has(c), c).toBe(false);
    }
    expect([...SERP_POSITION_COLUMNS].sort()).toEqual([...cols].sort());
  });

  it('maps a keyword check to existing columns, with site_id', () => {
    const row = toSerpPositionRow(
      { keyword: 'roofing', position: 4, url: 'https://example.com/r', ctr: estimateCtr(4) },
      { country: 'us', device: 'mobile', siteId: 'site-1' },
    );
    for (const k of Object.keys(row)) expect(cols.has(k), k).toBe(true);
    expect(row).toMatchObject({
      site_id: 'site-1',
      keyword: 'roofing',
      position: 4,
      url: 'https://example.com/r',
      location: 'us',
      device: 'mobile',
      search_engine: 'google',
      estimated_traffic: null,
    });
  });

  it('maps a SERP feature run to existing columns', () => {
    const row = toSerpFeaturesRow(
      { keyword: 'roofing', presentFeatures: ['featured_snippet', 'local_pack', 'news_results'], position: null, url: null },
      { country: 'us', device: 'desktop', siteId: null },
    );
    for (const k of Object.keys(row)) expect(cols.has(k), k).toBe(true);
    expect(row).toMatchObject({
      has_featured_snippet: true,
      has_local_pack: true,
      has_knowledge_panel: false,
      has_people_also_ask: false,
      position: null,
      site_id: null,
    });
  });

  it('keeps the response entries SEOManager reads, adding the stored row', () => {
    const display = [
      toPositionRecord({ keyword: 'a', position: 1, url: 'u1', ctr: 31.7 }, { domain: 'd', country: 'us', device: 'desktop' }),
      toPositionRecord({ keyword: 'b', position: null, url: null, ctr: 0 }, { domain: 'd', country: 'us', device: 'desktop' }),
    ];
    const merged = mergeSavedPositions(display, [
      { id: 'row-b', keyword: 'b', position: null },
      { id: 'row-a', keyword: 'a', position: 1 },
    ]);
    expect(merged[0]).toMatchObject({ id: 'row-a', keyword: 'a', current_position: 1, position_change: 0, search_volume: null });
    expect(merged[1]).toMatchObject({ id: 'row-b', keyword: 'b', current_position: null });
    expect(mergeSavedPositions(display, null)).toEqual(display);
  });

  it('check-keyword-positions inserts the storage rows, not the display records', () => {
    const src = read('supabase/functions/check-keyword-positions/index.ts');
    expect(src).toMatch(/\.insert\(serpRows\)/);
    expect(src).not.toMatch(/\.insert\(serpRecords\)/);
    expect(src).toMatch(/resolveSeoSiteId\(supabaseClient, user\.id\)/);
    expect(src).toMatch(/saved: !insertError/);
    expect(src).toMatch(/storage_error:/);
  });

  it('track-serp-features has no simulated path and stores real columns', () => {
    const src = read('supabase/functions/track-serp-features/index.ts');
    expect(src).not.toMatch(/Math\.random\(/);
    expect(src).not.toMatch(/simulatedFeatures|simulated: true|Simulated data/);
    const gate = src.indexOf('serpNotConfiguredResponse(corsHeaders)');
    expect(gate).toBeGreaterThan(-1);
    expect(src.indexOf('.insert(')).toBeGreaterThan(gate);
    expect(src).toMatch(/toSerpFeaturesRow\(/);
    expect(src).not.toMatch(/current_position:|owned_features: serpFeatures\.filter\(f => f\.owns_feature\)\.map/);
  });

  it('the site_id migration is additive: nullable, IF NOT EXISTS, no NOT NULL', () => {
    const sql = read('supabase/migrations/20260924150000_seo_serp_positions_site_id.sql');
    expect(sql).toMatch(/ADD COLUMN site_id UUID;/);
    expect(sql).toMatch(/column_name = 'site_id'/);
    expect(sql).not.toMatch(/SET NOT NULL|DROP /i);
  });
});

describe('site_id resolution', () => {
  it('prefers the profile, then the brikly site, then the oldest active site', () => {
    const sites = [
      { id: 's-old', key: 'other', is_active: true, created_at: '2025-01-01' },
      { id: 's-brikly', key: 'brikly', is_active: true, created_at: '2025-06-01' },
    ];
    expect(pickSiteId('s-profile', sites)).toBe('s-profile');
    expect(pickSiteId(null, sites)).toBe('s-brikly');
    expect(pickSiteId(null, [sites[0], { id: 's-new', key: 'x', created_at: '2026-01-01' }])).toBe('s-old');
    expect(pickSiteId(null, [])).toBeNull();
  });

  function fakeClient(tables: Record<string, { data: unknown; error: unknown } | 'throw'>) {
    return {
      from(table: string) {
        const result = tables[table];
        const chain: Record<string, unknown> = {};
        const done = () => {
          if (result === 'throw') throw new Error('relation does not exist');
          return Promise.resolve(result ?? { data: null, error: null });
        };
        chain.select = () => chain;
        chain.eq = () => Object.assign(done(), chain);
        chain.maybeSingle = done;
        return chain;
      },
    };
  }

  it('uses the caller profile site_id', async () => {
    const client = fakeClient({ user_profiles: { data: { site_id: 'p1' }, error: null } });
    expect(await resolveSeoSiteId(client, 'u')).toBe('p1');
  });

  it('falls back to the sites table, and to null when neither lookup works', async () => {
    const withSites = fakeClient({
      user_profiles: { data: null, error: { message: 'column site_id does not exist' } },
      sites: { data: [{ id: 'b', key: 'brikly', is_active: true }], error: null },
    });
    expect(await resolveSeoSiteId(withSites, 'u')).toBe('b');
    const none = fakeClient({ user_profiles: 'throw', sites: 'throw' });
    expect(await resolveSeoSiteId(none, 'u')).toBeNull();
  });
});
