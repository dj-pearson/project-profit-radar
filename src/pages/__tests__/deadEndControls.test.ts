import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

/**
 * US-371: dead-end controls on routed pages. Each of these was a button that
 * raised alert('coming soon'), toasted "Coming Soon", sent the browser to a
 * path no route answers, or had onClick={() => {}}.
 *
 * These read the source rather than render it (as communicationHubStubs does):
 * the pages pull in auth, query clients and layouts, and what is being pinned
 * is which handler each control is wired to.
 */

/** Source with comments stripped, since the files document the stubs they replaced. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

const STATEMENTS: Array<[string, string]> = [
  ['src/pages/BalanceSheet.tsx', 'balanceSheetCsv'],
  ['src/pages/ProfitAndLoss.tsx', 'profitAndLossCsv'],
  ['src/pages/CashFlowStatement.tsx', 'cashFlowCsv'],
  ['src/pages/GeneralLedger.tsx', 'generalLedgerCsv'],
  ['src/pages/TrialBalance.tsx', 'trialBalanceCsv'],
];

describe('statement Export buttons', () => {
  it.each(STATEMENTS)('%s exports a CSV instead of alerting', (path, builder) => {
    const src = code(path);
    expect(src).not.toMatch(/\balert\(/);
    expect(src).toMatch(/const handleExport = \(\) => \{[\s\S]*?downloadCsv\(/);
    expect(src).toContain(`${builder}(`);
    expect(src).toMatch(/onClick=\{handleExport\}/);
  });

  it('GeneralLedger no longer reads its running balance from its own initialiser', () => {
    expect(code('src/pages/GeneralLedger.tsx')).not.toMatch(/transactionsWithBalance\[index - 1\]/);
  });
});

describe('CRM New Opportunity', () => {
  const dashboard = code('src/pages/CRMDashboard.tsx');
  const opportunities = code('src/pages/CRMOpportunities.tsx');

  it('navigates to the opportunities page with the create dialog open', () => {
    expect(dashboard).not.toMatch(/title: 'Coming Soon'/);
    expect(dashboard).toContain("const NEW_OPPORTUNITY_PATH = '/crm/opportunities?new=1';");
    expect(dashboard).toMatch(/<Button onClick=\{openNewOpportunity\} aria-label="Create new opportunity">/);
  });

  it('opportunities page opens its dialog for ?new=1', () => {
    expect(opportunities).toMatch(/get\('new'\) === '1'[\s\S]{0,80}setShowNewOpportunityDialog\(true\)/);
    expect(readFileSync('src/routes/peopleRoutes.tsx', 'utf8')).toContain('path="/crm/opportunities"');
  });
});

describe('IntegrationMarketplace Connect', () => {
  const src = code('src/pages/IntegrationMarketplace.tsx');

  it('no longer sends the browser to an unrouted SPA path', () => {
    expect(src).not.toContain('/oauth/authorize');
    expect(src).toContain('getIntegrationAuthUrl(');
  });

  it('does not offer Connect for an oauth2 app without a start function', () => {
    expect(src).toMatch(/app\.auth_type === 'oauth2' && !hasOAuthStart\(app\.slug\) \? \(\s*<NotBuiltButton/);
  });
});

describe('PaymentCenter tabs', () => {
  const src = code('src/pages/PaymentCenter.tsx');

  it('link to the routed invoice and subscription pages instead of "coming soon"', () => {
    expect(src).not.toMatch(/coming soon/i);
    expect(src).toContain('<Link to="/invoices">');
    expect(src).toContain('<Link to="/subscription-settings">');
    const all = readdirSync('src/routes')
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => readFileSync(`src/routes/${f}`, 'utf8'))
      .join('\n');
    expect(all).toContain('path="/invoices"');
    expect(all).toContain('path="/subscription-settings"');
  });
});

describe('remaining stubs', () => {
  it('GanttChart settings is a not-built control, not an alert', () => {
    const src = code('src/components/schedule/GanttChart.tsx');
    expect(src).not.toMatch(/\balert\(/);
    expect(src).toMatch(/<NotBuiltButton feature="Schedule settings"/);
  });

  it('PostScheduler edit/delete/publish are not-built controls, not toasts', () => {
    const src = code('src/components/social-media/PostScheduler.tsx');
    expect(src).not.toMatch(/coming soon/i);
    expect(src.match(/<NotBuiltButton /g)).toHaveLength(4);
  });

  it('MobileShowcase has no no-op handlers', () => {
    expect(code('src/pages/MobileShowcase.tsx')).not.toMatch(/\(\) => \{\}/);
  });
});
