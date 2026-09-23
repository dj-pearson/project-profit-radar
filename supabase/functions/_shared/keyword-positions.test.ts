import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  estimateCtr,
  findDomainPosition,
  isSerpConfigured,
  serpNotConfiguredResponse,
  SERP_NOT_CONFIGURED_CODE,
  summarizePositions,
  toPositionRecord,
} from './keyword-positions.ts';

const src = readFileSync(
  join(process.cwd(), 'supabase/functions/check-keyword-positions/index.ts'),
  'utf8',
);

describe('check-keyword-positions: no fabricated rankings', () => {
  it('treats a missing or blank key as not configured', () => {
    expect(isSerpConfigured(undefined)).toBe(false);
    expect(isSerpConfigured(null)).toBe(false);
    expect(isSerpConfigured('   ')).toBe(false);
    expect(isSerpConfigured('abc123')).toBe(true);
  });

  it('answers a missing key with an error envelope, not success', async () => {
    const res = serpNotConfiguredResponse({ 'Access-Control-Allow-Origin': 'https://brikly.net' });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ success: false, code: SERP_NOT_CONFIGURED_CODE });
    expect(body.error).toMatch(/SERP_API_KEY/);
    expect(typeof body.timestamp).toBe('string');
    expect(body).not.toHaveProperty('positions');
  });

  it('the function has no Math.random and returns the not-configured error before any insert', () => {
    expect(src).not.toMatch(/Math\.random/);
    const gate = src.indexOf('serpNotConfiguredResponse(corsHeaders)');
    const insert = src.indexOf('.insert(');
    expect(gate).toBeGreaterThan(-1);
    expect(insert).toBeGreaterThan(gate);
  });

  it('matches the domain by hostname, not substring', () => {
    const organic = [
      { link: 'https://notexample.com/a' },
      { link: 'https://other.com/?ref=example.com' },
      { link: 'https://www.example.com/pricing' },
    ];
    expect(findDomainPosition(organic, 'example.com')).toEqual({
      position: 3,
      url: 'https://www.example.com/pricing',
    });
    expect(findDomainPosition(organic, 'https://www.example.com/')).toMatchObject({ position: 3 });
    expect(findDomainPosition([{ link: 'https://blog.example.com/x' }], 'example.com').position).toBe(1);
    expect(findDomainPosition(organic, 'missing.com')).toEqual({ position: null, url: null });
    expect(findDomainPosition(undefined, 'example.com')).toEqual({ position: null, url: null });
    expect(findDomainPosition([{ link: 42 }, { link: 'not a url' }], 'example.com').position).toBeNull();
  });

  it('builds rows with no invented volume or traffic', () => {
    const row = toPositionRecord(
      { keyword: 'roofing', position: 2, url: 'https://example.com/r', ctr: estimateCtr(2) },
      { domain: 'example.com', country: 'us', device: 'desktop' },
    );
    expect(row).toMatchObject({
      keyword: 'roofing',
      current_position: 2,
      ranking_url: 'https://example.com/r',
      search_volume: null,
      estimated_traffic: null,
      ctr: 24.7,
    });
  });

  it('summarizes deterministically', () => {
    const results = [
      { keyword: 'a', position: 1, url: 'u', ctr: estimateCtr(1) },
      { keyword: 'b', position: 12, url: 'u', ctr: estimateCtr(12) },
      { keyword: 'c', position: null, url: null, ctr: estimateCtr(null) },
    ];
    expect(summarizePositions(results)).toEqual({
      total_keywords: 3,
      ranking_keywords: 2,
      avg_position: 7,
      top_10_keywords: 1,
      top_3_keywords: 1,
      total_estimated_traffic: null,
    });
    expect(summarizePositions([]).avg_position).toBeNull();
    expect(estimateCtr(30)).toBe(0.5);
    expect(estimateCtr(15)).toBe(1.0);
  });
});
