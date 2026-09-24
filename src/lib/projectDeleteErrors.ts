/**
 * Web mirror of supabase/functions/_shared/project-delete.ts.
 *
 * Deleting a project that has invoices, bills, budgets, labor costs, pay apps,
 * retention, subcontractor payments or collections fails with Postgres 23503
 * since 20260924200000_missing_foreign_keys.sql. That refusal is intended; this
 * gives it a message and a code the screen can offer "archive instead" on.
 * supabase/functions/_shared/project-delete.test.ts checks the two copies agree.
 */

export const PROJECT_HAS_FINANCIAL_RECORDS = 'project_has_financial_records';

export const PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE =
  'This project has financial records (invoices, bills, budgets...). Archive it instead.';

/**
 * The status a project is archived to. There is no 'archived' status
 * (projects_status_check allows planning, active, on_hold, completed, closed,
 * cancelled); 'closed' is the one that means the money and paperwork are done,
 * and set_project_status() refuses it while invoices are unpaid.
 */
export const PROJECT_ARCHIVE_STATUS = 'closed';

/** Statuses where archiving would change nothing useful. */
const ALREADY_ARCHIVED = new Set(['closed', 'cancelled']);

export function canArchiveProject(status: string | null | undefined): boolean {
  return !ALREADY_ARCHIVED.has(String(status ?? ''));
}

export function isForeignKeyViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === '23503') return true;
  return typeof message === 'string' && /violates foreign key constraint/i.test(message);
}

export class ProjectHasFinancialRecordsError extends Error {
  readonly code = PROJECT_HAS_FINANCIAL_RECORDS;

  constructor(readonly projectId: string) {
    super(PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE);
    this.name = 'ProjectHasFinancialRecordsError';
  }
}

export function isProjectHasFinancialRecordsError(
  error: unknown
): error is ProjectHasFinancialRecordsError {
  return (
    error instanceof ProjectHasFinancialRecordsError ||
    (!!error &&
      typeof error === 'object' &&
      (error as { code?: unknown }).code === PROJECT_HAS_FINANCIAL_RECORDS)
  );
}
