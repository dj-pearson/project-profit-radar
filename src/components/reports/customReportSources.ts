/**
 * Columns the custom report builder can select, sort and date-filter on, per
 * data source. Every id here must be a real column in
 * src/integrations/supabase/types.ts; the builder sends them straight to
 * PostgREST, so a made-up one fails the whole query.
 *
 * time_entries used to list `date`, `hours` and `billable`, none of which
 * exist. The table records `start_time` (timestamptz) and `total_hours`, and
 * has no billable flag.
 */
export interface ReportField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  table: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export type ReportDataSource = 'projects' | 'job_costs' | 'time_entries' | 'expenses' | 'invoices';

export const AVAILABLE_FIELDS: Record<ReportDataSource, ReportField[]> = {
  projects: [
    { id: 'name', name: 'Project Name', type: 'string', table: 'projects' },
    { id: 'status', name: 'Status', type: 'string', table: 'projects' },
    { id: 'budget', name: 'Budget', type: 'number', table: 'projects', aggregation: 'sum' },
    { id: 'completion_percentage', name: 'Completion %', type: 'number', table: 'projects', aggregation: 'avg' },
    { id: 'start_date', name: 'Start Date', type: 'date', table: 'projects' },
    { id: 'end_date', name: 'End Date', type: 'date', table: 'projects' },
    { id: 'client_name', name: 'Client Name', type: 'string', table: 'projects' },
  ],
  job_costs: [
    { id: 'date', name: 'Date', type: 'date', table: 'job_costs' },
    { id: 'labor_cost', name: 'Labor Cost', type: 'number', table: 'job_costs', aggregation: 'sum' },
    { id: 'material_cost', name: 'Material Cost', type: 'number', table: 'job_costs', aggregation: 'sum' },
    { id: 'equipment_cost', name: 'Equipment Cost', type: 'number', table: 'job_costs', aggregation: 'sum' },
    { id: 'total_cost', name: 'Total Cost', type: 'number', table: 'job_costs', aggregation: 'sum' },
    { id: 'labor_hours', name: 'Labor Hours', type: 'number', table: 'job_costs', aggregation: 'sum' },
  ],
  time_entries: [
    { id: 'start_time', name: 'Start Time', type: 'date', table: 'time_entries' },
    { id: 'end_time', name: 'End Time', type: 'date', table: 'time_entries' },
    { id: 'total_hours', name: 'Hours', type: 'number', table: 'time_entries', aggregation: 'sum' },
    { id: 'description', name: 'Description', type: 'string', table: 'time_entries' },
    { id: 'labor_cost', name: 'Labor Cost', type: 'number', table: 'time_entries', aggregation: 'sum' },
  ],
  expenses: [
    { id: 'expense_date', name: 'Date', type: 'date', table: 'expenses' },
    { id: 'amount', name: 'Amount', type: 'number', table: 'expenses', aggregation: 'sum' },
    { id: 'vendor_name', name: 'Vendor', type: 'string', table: 'expenses' },
    { id: 'description', name: 'Description', type: 'string', table: 'expenses' },
    { id: 'is_billable', name: 'Billable', type: 'boolean', table: 'expenses' },
  ],
  invoices: [
    { id: 'invoice_number', name: 'Invoice Number', type: 'string', table: 'invoices' },
    { id: 'total_amount', name: 'Total Amount', type: 'number', table: 'invoices', aggregation: 'sum' },
    { id: 'status', name: 'Status', type: 'string', table: 'invoices' },
    { id: 'issue_date', name: 'Issue Date', type: 'date', table: 'invoices' },
    { id: 'due_date', name: 'Due Date', type: 'date', table: 'invoices' },
  ],
};

/** The column each source's date range filters on, and whether it holds a time. */
export const DATE_RANGE_FIELD: Record<ReportDataSource, { field: string; isTimestamp: boolean }> = {
  projects: { field: 'created_at', isTimestamp: true },
  job_costs: { field: 'date', isTimestamp: false },
  time_entries: { field: 'start_time', isTimestamp: true },
  expenses: { field: 'expense_date', isTimestamp: false },
  invoices: { field: 'issue_date', isTimestamp: false },
};

/**
 * Bounds for an inclusive date range. On a timestamp column a bare end date
 * means midnight at the start of that day, which would drop the whole last
 * day, so the upper bound runs to the end of it.
 */
export function dateRangeFilter(
  source: ReportDataSource,
  start: string,
  end: string
): { field: string; from: string; to: string } {
  const { field, isTimestamp } = DATE_RANGE_FIELD[source];
  const dateOnly = (d: string) => d.slice(0, 10);
  if (!isTimestamp) return { field, from: dateOnly(start), to: dateOnly(end) };
  return { field, from: `${dateOnly(start)}T00:00:00`, to: `${dateOnly(end)}T23:59:59.999` };
}
