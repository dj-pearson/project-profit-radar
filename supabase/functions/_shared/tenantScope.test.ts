import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// US-241, batch 2. Each of these took an id out of the request body and used
// it on a SERVICE-ROLE client with no check that the row belonged to the
// caller. The checks are plain code in each handler, so pin them here: a
// refactor that drops one reopens a cross-tenant read or write, and nothing
// else would notice.

const code = (fn: string) =>
  readFileSync(join('supabase', 'functions', fn, 'index.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');

/** Index of `needle` in `src`, failing loudly when it is absent. */
function at(src: string, needle: string): number {
  const i = src.indexOf(needle);
  expect(i, `missing: ${needle}`).toBeGreaterThan(-1);
  return i;
}

describe('service-role paths check the caller owns the body-named row', () => {
  it('image-processor runs storage and the documents update on the caller JWT', () => {
    const src = code('image-processor');
    expect(src).toContain('userClient.storage');
    expect(src).not.toMatch(/await supabase\.storage/);
    expect(src).not.toMatch(/\} = supabase\.storage/);
    expect(src).toMatch(/const \{ error: documentError \} = await userClient/);
    // The queue row takes the caller's company, not the body's.
    expect(src).toContain('companyId: claimedCompanyId');
    expect(src).toMatch(/const companyId = \(callerProfile\?\.company_id/);
  });

  it('process-behavioral-triggers scopes a signed-in caller to their own company', () => {
    const src = code('process-behavioral-triggers');
    const check = at(src, 'canActOnUser(');
    const firstWrite = at(src, ".from('behavioral_trigger_executions')");
    expect(check).toBeLessThan(firstWrite);
  });

  it('enhanced-blog-ai-fixed resolves the company from the caller before inserting', () => {
    const src = code('enhanced-blog-ai-fixed');
    const scope = at(src, 'resolveCompanyScope(callerProfile?.company_id, finalCompanyId)');
    const queueCheck = at(src, ".from('blog_generation_queue')\n        .select('company_id')");
    const insert = at(src, ".from('blog_posts')\n      .insert(insertData)");
    expect(scope).toBeLessThan(insert);
    expect(queueCheck).toBeLessThan(insert);
  });

  it('sync-analytics-data refuses a connection from another company before updating it', () => {
    const src = code('sync-analytics-data');
    const own = at(src, 'if (!ownsConnection)');
    const update = at(src, "sync_status: 'syncing'");
    expect(own).toBeLessThan(update);
  });

  it('social-webhook-deployer refuses a queue item from another company', () => {
    const src = code('social-webhook-deployer');
    const own = at(src, '!callerOwnsItem');
    const webhook = at(src, '.select("webhook_url")');
    expect(own).toBeLessThan(webhook);
  });

  it('generate-timeline-optimization reads only the caller company', () => {
    const src = code('generate-timeline-optimization');
    const scope = at(src, 'resolveCompanyScope(callerProfile?.company_id, bodyCompanyId)');
    const read = at(src, "from('projects')");
    expect(scope).toBeLessThan(read);
  });

  it('ml-lead-scoring is root_admin only and looks the profile up by id', () => {
    // leads is the platform sales pipeline (site_id, no company_id).
    const src = code('ml-lead-scoring');
    expect(src).not.toMatch(/\.eq\('user_id', user\.id\)/);
    const gate = at(src, "userProfile?.role !== 'root_admin'");
    const read = at(src, ".from('leads')");
    expect(gate).toBeLessThan(read);
  });
});
