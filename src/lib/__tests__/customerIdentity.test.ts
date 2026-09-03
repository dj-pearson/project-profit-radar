/**
 * US-326: one customer, not four rows.
 *
 * A homeowner who was a lead, got an estimate, became a project and logged
 * into the portal existed as four rows with no key between them: a CRM
 * contact, free text on the estimate, free text on the project, and an email
 * on their portal access. A corrected phone number had to be fixed four times,
 * nobody could answer "what have we done for this customer", and the same
 * person spelled two ways was two customers.
 *
 * CreateProject's autocomplete made it worse rather than better: it offered
 * NAMES de-duplicated from past projects, so choosing one copied the text
 * again instead of linking a record. That is the specific thing several of
 * these assertions are about.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('--'))
    .join('\n');

const migration = strip('supabase/migrations/20260903110000_one_customer.sql');
const createProject = strip('src/pages/CreateProject.tsx');
const estimateForm = strip('src/components/estimates/EstimateForm.tsx');

describe('the customer is one record (US-326)', () => {
  it('links all four tables to contacts, additively', () => {
    for (const table of ['estimates', 'projects', 'invoices', 'client_portal_access']) {
      expect(migration).toMatch(
        new RegExp(`ALTER TABLE public\\.${table}[\\s\\S]{0,120}ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public\\.contacts`)
      );
    }
  });

  it('keeps the legacy text columns for a release', () => {
    // iOS at MIN_SUPPORTED_IOS_VERSION reads projects.client_name and would
    // show blank customers the day it was dropped.
    expect(migration).not.toMatch(/DROP COLUMN client_name/);
    expect(migration).not.toMatch(/DROP COLUMN client_email/);
    expect(createProject).toMatch(/client_name: clientName/);
  });

  it('backfills by email within a company, never by name', () => {
    // Matching on name would merge two different Dana Whitfields at the same
    // builder, which is worse than leaving a row unlinked.
    expect(migration).toMatch(/lower\(btrim\(c\.email\)\) = lower\(btrim\(p\.client_email\)\)/);
    expect(migration).toMatch(/c\.company_id = p\.company_id/);
    expect(migration).not.toMatch(/lower\(c\.first_name\) = /);
  });

  it('reports what it could not match instead of guessing', () => {
    expect(migration).toMatch(/v_unmatched/);
    expect(migration).toMatch(/RAISE NOTICE 'US-326 customer backfill/);
  });

  it('creates contacts from projects, not from unaccepted estimates', () => {
    // A project is a customer the contractor definitely has a relationship
    // with; inventing CRM records for strangers who got a quote inflates the
    // pipeline.
    const insert = migration.slice(migration.indexOf('INSERT INTO public.contacts'));
    expect(insert).toMatch(/FROM candidates/);
    expect(migration).toMatch(/FROM public\.projects p\n {5}WHERE p\.client_id IS NULL/);
  });
});

describe('the forms pick a customer instead of retyping one (US-326)', () => {
  it('replaces the name-copying autocomplete on CreateProject', () => {
    expect(createProject).toMatch(/ContactPicker/);
    expect(createProject).toMatch(/client_id: clientId/);
    // The old machinery, which selected names from past projects.
    expect(createProject).not.toMatch(/setRecentClients/);
    expect(createProject).not.toMatch(/selectRecentClient/);
  });

  it('links the customer on an estimate too', () => {
    expect(estimateForm).toMatch(/ContactPicker/);
    expect(estimateForm).toMatch(/client_id: clientId \|\| null/);
  });

  it('restores the link when an estimate is edited', () => {
    // Otherwise opening and saving an estimate silently unlinks its customer.
    expect(estimateForm).toMatch(/setClientId\(estimate\.client_id \|\| null\)/);
  });

  it('offers inline create, so the picker is never a dead end', () => {
    const picker = strip('src/components/customers/ContactPicker.tsx');
    expect(picker).toMatch(/Add a new customer/);
    expect(picker).toMatch(/from\('contacts'\)\s*\n?\s*\.insert/);
  });
});

describe('everything for one customer (US-326)', () => {
  it('has one definition of what counts, as a view', () => {
    // So the customer page and any future report cannot drift.
    expect(migration).toMatch(/CREATE OR REPLACE VIEW public\.customer_activity/);
    for (const kind of ['estimate', 'project', 'invoice', 'portal_access']) {
      expect(migration).toMatch(new RegExp(`'${kind}'`));
    }
  });

  it('is reachable at a route', () => {
    const routes = readFileSync('src/routes/peopleRoutes.tsx', 'utf8');
    expect(routes).toMatch(/path="\/customers\/:contactId"/);
    expect(existsSync('src/pages/CustomerDetail.tsx')).toBe(true);
  });

  it('reads the view rather than four separate queries', () => {
    const page = strip('src/pages/CustomerDetail.tsx');
    expect(page).toMatch(/from\('customer_activity'\)/);
  });
});

describe('the guard that keeps it one record (US-326)', () => {
  it('passes on the current tree', () => {
    const out = execFileSync('node', ['scripts/check-customer-links.mjs'], { encoding: 'utf8' });
    expect(out).toMatch(/No new unlinked customer writes/);
  });

  it('is wired into pre-commit and CI', () => {
    expect(readFileSync('.husky/pre-commit', 'utf8')).toContain('check-customer-links.mjs');
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain('check-customer-links.mjs');
  });

  it('does not flag a write that links the customer', () => {
    const guard = readFileSync('scripts/check-customer-links.mjs', 'utf8');
    expect(guard).toMatch(/if \(\/\\bclient_id\\s\*:\/\.test\(near\)\) return;/);
  });
});
