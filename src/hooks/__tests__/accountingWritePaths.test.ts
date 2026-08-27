import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * US-310. Journal entries, bills and bill payments could not be created at all.
 * All three mutations opened with
 *
 *     .rpc('nextval', { sequence_name: 'journal_entry_number_seq' })
 *     if (seqError) throw seqError;
 *
 * and nextval is pg_catalog.nextval(regclass): it lives in a schema PostgREST
 * does not expose, and takes one regclass argument rather than a
 * `sequence_name`. Either fact on its own makes the call unresolvable, and no
 * migration ever created a public wrapper, so every create path threw on its
 * first statement.
 *
 * The number is now assigned by a BEFORE INSERT trigger, matching how every
 * other numbered document in this schema works. These cases pin both halves:
 * the migration defines the functions and triggers, and the clients no longer
 * generate the number themselves. The runtime behaviour - trigger fills a
 * missing number, keeps one an older client supplies, replaces a blank string,
 * and the per-company UNIQUE constraint still holds - was verified by applying
 * the real table DDL and this migration to Postgres 16.
 */

const MIGRATIONS = 'supabase/migrations';
const MIGRATION = '20260827120000_accounting_write_paths.sql';

const DOCUMENTS = [
  { table: 'journal_entries', column: 'entry_number', fn: 'generate_journal_entry_number', prefix: 'JE-' },
  { table: 'bills', column: 'bill_number', fn: 'generate_bill_number', prefix: 'BILL-' },
  { table: 'bill_payments', column: 'payment_number', fn: 'generate_bill_payment_number', prefix: 'PMT-' },
];

const CLIENTS = ['src/hooks/useAccounting.ts', 'src/pages/BillPayments.tsx'];

/** File contents with comment lines stripped, so documenting a shape is not using it. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('--');
    })
    .join('\n');
}

/** The object literals passed to `.insert(...)`, so a type declaration is not mistaken for a write. */
function insertPayloads(src: string): string[] {
  const out: string[] = [];
  const re = /\.insert\(\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    out.push(src.slice(m.index, i));
  }
  return out;
}

describe('the numbering migration', () => {
  const sql = readFileSync(join(MIGRATIONS, MIGRATION), 'utf8');

  it.each(DOCUMENTS)('defines $fn as SECURITY DEFINER with an explicit search_path', ({ fn, prefix }) => {
    const body = sql.slice(sql.indexOf(`CREATE OR REPLACE FUNCTION public.${fn}()`));
    expect(body, `${fn} is not defined`).toContain(`CREATE OR REPLACE FUNCTION public.${fn}()`);
    const decl = body.slice(0, body.indexOf('$function$;') + 1);
    expect(decl).toContain('SECURITY DEFINER');
    expect(decl).toContain("SET search_path = ''");
    expect(decl).toContain(`'${prefix}'`);
  });

  it.each(DOCUMENTS)('assigns $column on $table with a BEFORE INSERT trigger', ({ table, column }) => {
    expect(sql).toMatch(new RegExp(`BEFORE INSERT ON public\\.${table}\\b`));
    expect(sql).toContain(`NEW.${column}`);
  });

  it('only assigns when the caller left the column empty, so an older client keeps its own number', () => {
    // A bare `IS NULL` would let a blank string through NOT NULL as a document
    // with no number at all.
    for (const { column } of DOCUMENTS) {
      expect(sql).toContain(`IF NULLIF(trim(COALESCE(NEW.${column}, '')), '') IS NULL THEN`);
    }
  });

  it('does not add a public nextval wrapper, which would expose every sequence by name', () => {
    expect(sql).not.toMatch(/FUNCTION\s+(public\.)?nextval\s*\(/i);
  });
});

describe('the client mutations', () => {
  it.each(CLIENTS)('%s does not call the nextval RPC', (path) => {
    expect(code(path)).not.toMatch(/\.rpc\(\s*['"`]nextval['"`]/);
  });

  it.each(DOCUMENTS)('no client sends $column in an insert payload, which the trigger owns', ({ column }) => {
    for (const path of CLIENTS) {
      for (const payload of insertPayloads(code(path))) {
        expect(payload, `${path} still sets ${column} in an insert`).not.toMatch(
          new RegExp(`\\b${column}\\s*:`),
        );
      }
    }
  });

  it.each(DOCUMENTS)('no client builds a $prefix number itself', ({ prefix }) => {
    for (const path of CLIENTS) {
      // The number is the trigger's to mint. A client template literal here
      // means someone reintroduced client-side numbering, which is not atomic
      // with the insert.
      expect(code(path), `${path} builds its own ${prefix} number`).not.toContain(`\`${prefix}$`);
    }
  });
});

describe('the sequences the numbering depends on', () => {
  it('all three exist in a migration', () => {
    const all = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
      .join('\n');
    for (const seq of ['journal_entry_number_seq', 'bill_number_seq', 'bill_payment_number_seq']) {
      expect(all, `${seq} is not created by any migration`).toMatch(
        new RegExp(`CREATE SEQUENCE (IF NOT EXISTS )?(public\\.)?${seq}\\b`),
      );
    }
  });
});

describe('apply_bill_payment', () => {
  const sql = readFileSync(join(MIGRATIONS, MIGRATION), 'utf8');
  const fn = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.apply_bill_payment('));
  const body = fn.slice(0, fn.indexOf('$function$;') + 1);

  it('exists at all, which it never did while the client called it', () => {
    expect(body).toContain('CREATE OR REPLACE FUNCTION public.apply_bill_payment(');
  });

  it('is SECURITY DEFINER with an explicit search_path', () => {
    expect(body).toContain('SECURITY DEFINER');
    expect(body).toContain("SET search_path = ''");
  });

  it('enforces tenancy itself, because SECURITY DEFINER bypasses RLS', () => {
    expect(body).toContain('public.user_in_company(company_id)');
  });

  it('does the read and the write in one UPDATE, so concurrent payments serialise', () => {
    // A separate SELECT followed by an UPDATE reintroduces the lost-update the
    // client-side fallback had: two payments read the same amount_paid and both
    // write the same total. Verified against Postgres 16 - the second caller
    // blocks on the row lock and applies on top.
    expect(body).toContain('SET amount_paid = COALESCE(amount_paid, 0) + p_amount');
    expect(body).not.toMatch(/SELECT[\s\S]*FROM public\.bills[\s\S]*FOR UPDATE/);
  });

  it('refuses a non-positive amount', () => {
    expect(body).toContain('p_amount <= 0');
  });

  it('does not flip a voided or draft bill to paid', () => {
    expect(body).toContain("WHEN status IN ('void', 'draft') THEN status");
  });

  it('answers "not found" for another company\'s bill rather than confirming it exists', () => {
    expect(body).toContain("RAISE EXCEPTION 'bill not found'");
    expect(body).not.toMatch(/forbidden|not authoriz|permission denied/i);
  });

  it('the client no longer falls back to a client-side read-modify-write', () => {
    const client = code('src/pages/BillPayments.tsx');
    for (const payload of insertPayloads(client)) {
      expect(payload).not.toMatch(/amount_paid\s*:/);
    }
    expect(client).not.toMatch(/from\(['"]bills['"]\)[\s\S]{0,120}\.update\(/);
  });
});
