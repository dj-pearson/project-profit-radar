/**
 * The query behind the custom report builder's preview (US-266, US-403).
 *
 * Every failure reaches the caller. This used to fall back to generateMockData
 * on any error and hand back rows of Math.random() dollar amounts, which the
 * builder announced as "Report generated successfully" and offered as an
 * Excel export.
 *
 * The builder also offered filters (equals, contains, greater than...) and
 * never applied them: a report "where status equals active" returned every
 * project. They are applied now, on columns from AVAILABLE_FIELDS only. The
 * read is capped at REPORT_ROW_LIMIT rows and says when it hit the cap.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AVAILABLE_FIELDS, dateRangeFilter, type ReportDataSource } from '@/components/reports/customReportSources';

export const REPORT_ROW_LIMIT = 1000;

export interface ReportQueryFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: string | number | [string | number, string | number];
}

export interface ReportQueryConfig {
  dataSource: ReportDataSource;
  filters: ReportQueryFilter[];
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  dateRange: { start: string; end: string };
}

export interface ReportRows {
  rows: Record<string, unknown>[];
  /** True when the read returned REPORT_ROW_LIMIT rows and more may exist. */
  truncated: boolean;
}

// The PostgREST filter methods these operators use, on an untyped builder:
// the table is chosen at run time, so the typed client cannot see its columns.
interface FilterBuilder {
  eq(c: string, v: unknown): FilterBuilder;
  neq(c: string, v: unknown): FilterBuilder;
  gt(c: string, v: unknown): FilterBuilder;
  lt(c: string, v: unknown): FilterBuilder;
  gte(c: string, v: unknown): FilterBuilder;
  lte(c: string, v: unknown): FilterBuilder;
  ilike(c: string, v: string): FilterBuilder;
  order(c: string, o: { ascending: boolean }): FilterBuilder;
  limit(n: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
}

/** Filters with an empty value are skipped; a field not in AVAILABLE_FIELDS is refused. */
export function applyReportFilters(
  query: FilterBuilder,
  source: ReportDataSource,
  filters: ReportQueryFilter[],
): FilterBuilder {
  const allowed = new Set(AVAILABLE_FIELDS[source].map((f) => f.id));
  let q = query;
  for (const f of filters) {
    if (!allowed.has(f.field)) throw new Error(`"${f.field}" is not a column this report can filter on.`);
    if (f.operator === 'between') {
      if (!Array.isArray(f.value)) continue;
      q = q.gte(f.field, f.value[0]).lte(f.field, f.value[1]);
      continue;
    }
    const v = Array.isArray(f.value) ? f.value[0] : f.value;
    if (v === '' || v == null) continue;
    switch (f.operator) {
      case 'equals': q = q.eq(f.field, v); break;
      case 'not_equals': q = q.neq(f.field, v); break;
      case 'greater_than': q = q.gt(f.field, v); break;
      case 'less_than': q = q.lt(f.field, v); break;
      // Escape the ILIKE wildcards so "50%" means the text 50%.
      case 'contains': q = q.ilike(f.field, `%${String(v).replace(/[\\%_]/g, (c) => `\\${c}`)}%`); break;
    }
  }
  return q;
}

export async function fetchCustomReportRows(companyId: string, config: ReportQueryConfig): Promise<ReportRows> {
  if (!(config.dataSource in AVAILABLE_FIELDS)) throw new Error('Invalid data source');
  let query = (supabase.from(config.dataSource).select('*') as unknown as FilterBuilder).eq('company_id', companyId);

  if (config.dateRange.start && config.dateRange.end) {
    const { field, from, to } = dateRangeFilter(config.dataSource, config.dateRange.start, config.dateRange.end);
    query = query.gte(field, from).lte(field, to);
  }
  query = applyReportFilters(query, config.dataSource, config.filters);
  if (config.sortBy) query = query.order(config.sortBy, { ascending: config.sortOrder === 'asc' });

  const { data, error } = await query.limit(REPORT_ROW_LIMIT);
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  return { rows, truncated: rows.length >= REPORT_ROW_LIMIT };
}

export function useCustomReportData() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  return useMutation({
    mutationFn: (config: ReportQueryConfig) => {
      if (!companyId) throw new Error('No company found');
      return fetchCustomReportRows(companyId, config);
    },
  });
}
