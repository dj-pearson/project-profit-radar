import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { AVAILABLE_FIELDS, DATE_RANGE_FIELD, dateRangeFilter, type ReportDataSource } from '../customReportSources';

/**
 * US-368 leftover. The builder filtered and offered `time_entries.date`,
 * `hours` and `billable`; none exist, so every time-entry report failed.
 * Every column the builder can send must be in the generated Row type.
 */

const TYPES = readFileSync('src/integrations/supabase/types.ts', 'utf8');

function rowColumns(table: string): string[] {
  const m = TYPES.match(new RegExp(`\\n      ${table}: \\{\\n        Row: \\{([\\s\\S]*?)\\n        \\}`));
  if (!m) throw new Error(`no Row type for ${table}`);
  return [...m[1].matchAll(/\n {10}(\w+):/g)].map((x) => x[1]);
}

const SOURCES = Object.keys(AVAILABLE_FIELDS) as ReportDataSource[];

describe('custom report columns', () => {
  it.each(SOURCES)('%s: every selectable field is a real column', (source) => {
    const cols = rowColumns(source);
    for (const f of AVAILABLE_FIELDS[source]) expect(cols, `${source}.${f.id}`).toContain(f.id);
  });

  it.each(SOURCES)('%s: the date-range column is real', (source) => {
    expect(rowColumns(source)).toContain(DATE_RANGE_FIELD[source].field);
  });

  it('time_entries filters on start_time, not the nonexistent date column', () => {
    expect(rowColumns('time_entries')).not.toContain('date');
    expect(DATE_RANGE_FIELD.time_entries.field).toBe('start_time');
    expect(AVAILABLE_FIELDS.time_entries.map((f) => f.id)).not.toContain('date');
  });
});

describe('dateRangeFilter', () => {
  it('runs a timestamp range to the end of the last day', () => {
    expect(dateRangeFilter('time_entries', '2026-09-01', '2026-09-30')).toEqual({
      field: 'start_time',
      from: '2026-09-01T00:00:00',
      to: '2026-09-30T23:59:59.999',
    });
  });

  it('leaves a date column range as plain dates', () => {
    expect(dateRangeFilter('expenses', '2026-09-01', '2026-09-30')).toEqual({
      field: 'expense_date',
      from: '2026-09-01',
      to: '2026-09-30',
    });
  });
});

describe('CustomReportBuilder query errors', () => {
  const src = readFileSync('src/components/reports/CustomReportBuilder.tsx', 'utf8');
  // The query moved into useCustomReportData (US-266).
  const hook = readFileSync('src/hooks/useCustomReportData.ts', 'utf8');

  it('throws the PostgREST error instead of returning mock rows', () => {
    expect(hook).toMatch(/const \{ data, error \} = await query\.limit\(REPORT_ROW_LIMIT\);\s*if \(error\) throw error;/);
    expect(src).not.toMatch(/generateMockData\(/);
    const hookCode = hook.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(hookCode).not.toMatch(/generateMockData\(|Math\.random\(/);
  });

  it('shows the failure to the user', () => {
    expect(src).toContain('title: "Could not generate report"');
  });

  it('uses the shared date-range column map', () => {
    expect(hook).toContain('dateRangeFilter(config.dataSource');
    expect(hook).not.toMatch(/'time_entries' \? 'date'/);
  });

  it('scopes the report to the company', () => {
    expect(hook).toContain(".eq('company_id', companyId)");
  });
});
