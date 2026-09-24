import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FOREIGN_KEY_VIOLATION,
  PROJECT_HAS_FINANCIAL_RECORDS,
  PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE,
  PROJECT_HAS_FINANCIAL_RECORDS_STATUS,
  isForeignKeyViolation,
  projectHasFinancialRecordsBody,
  projectHasFinancialRecordsResponse,
} from './project-delete';
import * as web from '../../../src/lib/projectDeleteErrors';

const FK_ERROR = {
  code: '23503',
  message:
    'update or delete on table "projects" violates foreign key constraint "budget_line_items_project_id_fkey" on table "budget_line_items"',
  details: 'Key (id)=(p1) is still referenced from table "budget_line_items".',
};

describe('isForeignKeyViolation', () => {
  it('matches the PostgREST 23503 error', () => {
    expect(FOREIGN_KEY_VIOLATION).toBe('23503');
    expect(isForeignKeyViolation(FK_ERROR)).toBe(true);
  });

  it('matches on the message when the code was dropped', () => {
    expect(isForeignKeyViolation(new Error(FK_ERROR.message))).toBe(true);
  });

  it('does not match other errors', () => {
    expect(isForeignKeyViolation({ code: '42501', message: 'permission denied for table projects' })).toBe(false);
    expect(isForeignKeyViolation({ code: '23505', message: 'duplicate key value' })).toBe(false);
    expect(isForeignKeyViolation(null)).toBe(false);
    expect(isForeignKeyViolation('23503')).toBe(false);
  });
});

describe('refused project delete envelope', () => {
  it('keeps the envelope and adds code', () => {
    expect(projectHasFinancialRecordsBody('2026-09-24T00:00:00.000Z')).toEqual({
      success: false,
      error: PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE,
      code: 'project_has_financial_records',
      timestamp: '2026-09-24T00:00:00.000Z',
    });
  });

  it('keeps the 500 this path always returned', async () => {
    const res = projectHasFinancialRecordsResponse({ 'Access-Control-Allow-Origin': 'https://brikly.net' });
    expect(res.status).toBe(500);
    expect(PROJECT_HAS_FINANCIAL_RECORDS_STATUS).toBe(500);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://brikly.net');
    const body = await res.json();
    expect(body.code).toBe(PROJECT_HAS_FINANCIAL_RECORDS);
    expect(body.success).toBe(false);
    expect(typeof body.timestamp).toBe('string');
  });
});

describe('web mirror agrees', () => {
  it('has the same code, message and detection', () => {
    expect(web.PROJECT_HAS_FINANCIAL_RECORDS).toBe(PROJECT_HAS_FINANCIAL_RECORDS);
    expect(web.PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE).toBe(PROJECT_HAS_FINANCIAL_RECORDS_MESSAGE);
    for (const e of [FK_ERROR, new Error(FK_ERROR.message), { code: '42501', message: 'x' }, null]) {
      expect(web.isForeignKeyViolation(e)).toBe(isForeignKeyViolation(e));
    }
  });
});

describe('web archive target', () => {
  it('archives to a status projects_status_check allows', () => {
    expect(web.PROJECT_ARCHIVE_STATUS).toBe('closed');
  });

  it('offers archive only while the project is still open', () => {
    for (const s of ['planning', 'active', 'on_hold', 'completed']) {
      expect(web.canArchiveProject(s)).toBe(true);
    }
    expect(web.canArchiveProject('closed')).toBe(false);
    expect(web.canArchiveProject('cancelled')).toBe(false);
  });
});

describe('projects edge function DELETE', () => {
  const src = readFileSync(join(__dirname, '..', 'projects', 'index.ts'), 'utf8');

  it('answers a foreign-key refusal with the coded envelope before the generic throw', () => {
    const del = src.slice(src.indexOf('case "DELETE"'));
    const guard = del.indexOf('isForeignKeyViolation(deleteError)');
    const generic = del.indexOf('throw new Error(`Project deletion error');
    expect(guard).toBeGreaterThan(-1);
    expect(del).toContain('projectHasFinancialRecordsResponse(getCorsHeaders(req))');
    expect(guard).toBeLessThan(generic);
  });
});
