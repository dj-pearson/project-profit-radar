import { describe, it, expect, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { OAUTH_START_FUNCTIONS, getIntegrationAuthUrl, hasOAuthStart } from '../integrationOAuth';

/**
 * US-371. IntegrationMarketplace sent every oauth2 app to
 * /integrations/:slug/oauth/authorize, which no route answers. Connect now goes
 * through a real edge function, or is not offered.
 */

const ctx = { companyId: 'co-1', origin: 'https://brikly.net' };

describe('OAUTH_START_FUNCTIONS', () => {
  it.each(Object.entries(OAUTH_START_FUNCTIONS))('%s points at an edge function that exists', (_slug, start) => {
    expect(existsSync(`supabase/functions/${start.functionName}/index.ts`)).toBe(true);
  });

  it('sends QuickBooks back to a routed callback', () => {
    const body = OAUTH_START_FUNCTIONS.quickbooks.body(ctx);
    expect(body.redirect_uri).toBe('https://brikly.net/quickbooks/callback');
    expect(readFileSync('src/routes/financialRoutes.tsx', 'utf8')).toContain('path="/quickbooks/callback"');
  });

  it('has no start for integrations with no edge function', () => {
    expect(hasOAuthStart('quickbooks')).toBe(true);
    expect(hasOAuthStart('xero')).toBe(false);
    expect(hasOAuthStart('slack')).toBe(false);
    expect(hasOAuthStart('toString')).toBe(false);
  });
});

describe('getIntegrationAuthUrl', () => {
  it('invokes the start function and returns its provider URL', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { auth_url: 'https://appcenter.intuit.com/connect/oauth2?client_id=x' },
      error: null,
    });
    await expect(getIntegrationAuthUrl('quickbooks', ctx, invoke)).resolves.toBe(
      'https://appcenter.intuit.com/connect/oauth2?client_id=x'
    );
    expect(invoke).toHaveBeenCalledWith('quickbooks-connect', {
      body: { company_id: 'co-1', redirect_uri: 'https://brikly.net/quickbooks/callback' },
    });
  });

  it('throws for an integration with no start function, without calling anything', async () => {
    const invoke = vi.fn();
    await expect(getIntegrationAuthUrl('xero', ctx, invoke)).rejects.toThrow(/No OAuth start/);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('throws when the edge function errors', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: new Error('401 Unauthorized') });
    await expect(getIntegrationAuthUrl('google-calendar', ctx, invoke)).rejects.toThrow('401 Unauthorized');
  });

  it('refuses a relative or untrusted URL', async () => {
    for (const auth_url of ['/integrations/quickbooks/oauth/authorize', 'https://evil.example.com/x', undefined]) {
      const invoke = vi.fn().mockResolvedValue({ data: { auth_url }, error: null });
      await expect(getIntegrationAuthUrl('quickbooks', ctx, invoke)).rejects.toThrow(/Invalid OAuth URL/);
    }
  });

  it('throws without a company', async () => {
    const invoke = vi.fn();
    await expect(getIntegrationAuthUrl('quickbooks', { ...ctx, companyId: '' }, invoke)).rejects.toThrow(/No company/);
  });
});
