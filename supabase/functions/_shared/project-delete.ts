/**
 * Refusing to delete a project that has money attached to it.
 *
 * 20260924200000_missing_foreign_keys.sql made budget_line_items,
 * budget_tracking, labor_costs, payment_applications, retention_items,
 * subcontractor_payments and collection_items reference projects without a
 * cascade, joining bills, estimates, change_orders and journal_entries. So a
 * delete of a project with any of those rows fails with Postgres 23503. That
 * is the intended outcome; this turns the raw constraint error into something
 * the person can act on: archive (close) the project instead.
 *
 * Dependency-free so vitest can run it. src/lib/projectDeleteErrors.ts is the
 * web mirror; project-delete.test.ts checks the two agree.
 */

import { apiVersionHeaders, stampEnvelope } from './api-version.ts';

export const PROJECT_HAS_FINANCIAL_RECORDS = 'project_has_financial_records';

export const PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE =
  'This project has financial records (invoices, bills, budgets...). Archive it instead.';

/** Postgres foreign_key_violation. */
export const FOREIGN_KEY_VIOLATION = '23503';

/**
 * Is this a PostgREST / Postgres foreign-key violation?
 *
 * PostgREST returns { code: '23503', message: 'update or delete on table
 * "projects" violates foreign key constraint ...' }. The message check covers
 * a wrapper that dropped the code.
 */
export function isForeignKeyViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === FOREIGN_KEY_VIOLATION) return true;
  return typeof message === 'string' && /violates foreign key constraint/i.test(message);
}

/**
 * The envelope for a refused project delete. The status stays what this path
 * always returned (the catch-all 500) so no client sees a new status code for
 * the same outcome; `code` is the additive field a client branches on.
 */
export function projectHasFinancialRecordsBody(timestamp: string = new Date().toISOString()) {
  return {
    success: false as const,
    error: PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE,
    code: PROJECT_HAS_FINANCIAL_RECORDS,
    timestamp,
  };
}

export const PROJECT_HAS_FINANCIAL_RECORDS_STATUS = 500;

export function projectHasFinancialRecordsResponse(headers: Record<string, string>): Response {
  // US-273: api_version + version headers, additive (docs/API_VERSIONING.md).
  return new Response(JSON.stringify(stampEnvelope(projectHasFinancialRecordsBody())), {
    status: PROJECT_HAS_FINANCIAL_RECORDS_STATUS,
    headers: { 'Content-Type': 'application/json', ...headers, ...apiVersionHeaders() },
  });
}
