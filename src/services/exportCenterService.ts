import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  nextRunDate,
  type ExportFormat,
  type ReportTemplateId,
  type ScheduleFrequency,
  type TableData,
} from '@/lib/export-center';

/**
 * US-086: Export Center persistence + report data assembly. All reads/writes
 * are company_id-scoped for site isolation. Report formatting (CSV/Excel/PDF)
 * lives in lib/export-formats; schedule math lives in lib/export-center.
 */

export interface ReportFilters {
  projectId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ScheduledReport {
  id: string;
  name: string;
  template: string;
  format: string;
  frequency: string;
  recipients: string[];
  start_date: string;
  next_run_at: string | null;
  is_active: boolean;
}

export interface ExportHistoryRow {
  id: string;
  template: string;
  format: string;
  filters: ReportFilters;
  row_count: number;
  created_at: string;
}

const money = (n: number | null | undefined) => (n == null ? '' : Number(n).toFixed(2));
const dateOnly = (s: string | null | undefined) => (s ? s.slice(0, 10) : '');

/** Assemble a report's tabular data for a template + filters, company-scoped. */
export async function fetchReportData(
  template: ReportTemplateId,
  filters: ReportFilters,
  companyId: string
): Promise<TableData> {
  switch (template) {
    case 'project-summary':
      return projectSummary(filters, companyId);
    case 'financial':
      return financial(filters, companyId);
    case 'time':
      return timeReport(filters, companyId);
    case 'equipment':
      return equipment(companyId);
    case 'aging':
      return aging(companyId);
    default:
      return { columns: [], rows: [] };
  }
}

async function projectSummary(filters: ReportFilters, companyId: string): Promise<TableData> {
  let q = supabase
    .from('projects')
    .select('id, name, status, budget, total_budget, completion_percentage, start_date, end_date')
    .eq('company_id', companyId);
  if (filters.projectId) q = q.eq('id', filters.projectId);
  if (filters.startDate) q = q.gte('start_date', filters.startDate);
  if (filters.endDate) q = q.lte('start_date', filters.endDate);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return {
    columns: [
      { key: 'name', header: 'Project' },
      { key: 'status', header: 'Status' },
      { key: 'budget', header: 'Budget' },
      { key: 'completion', header: '% Complete' },
      { key: 'start', header: 'Start' },
      { key: 'end', header: 'End' },
    ],
    rows: (data ?? []).map((p) => ({
      name: p.name ?? '',
      status: p.status ?? '',
      budget: money(p.total_budget ?? p.budget),
      completion: p.completion_percentage ?? 0,
      start: dateOnly(p.start_date),
      end: dateOnly(p.end_date),
    })),
  };
}

async function financial(filters: ReportFilters, companyId: string): Promise<TableData> {
  let q = supabase
    .from('invoices')
    .select('invoice_number, total_amount, amount_due, status, issue_date')
    .eq('company_id', companyId);
  if (filters.projectId) q = q.eq('project_id', filters.projectId);
  if (filters.startDate) q = q.gte('issue_date', filters.startDate);
  if (filters.endDate) q = q.lte('issue_date', filters.endDate);
  const { data, error } = await q.order('issue_date', { ascending: false });
  if (error) throw new Error(error.message);
  return {
    columns: [
      { key: 'number', header: 'Invoice #' },
      { key: 'issued', header: 'Issued' },
      { key: 'total', header: 'Total' },
      { key: 'due', header: 'Amount Due' },
      { key: 'status', header: 'Status' },
    ],
    rows: (data ?? []).map((i) => ({
      number: i.invoice_number ?? '',
      issued: dateOnly(i.issue_date),
      total: money(i.total_amount),
      due: money(i.amount_due),
      status: i.status ?? '',
    })),
  };
}

async function timeReport(filters: ReportFilters, companyId: string): Promise<TableData> {
  // time_entries has no company_id — scope via the company's projects.
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', companyId);
  if (projErr) throw new Error(projErr.message);
  const nameById = new Map((projects ?? []).map((p) => [p.id, p.name as string]));
  const projectIds = filters.projectId ? [filters.projectId] : Array.from(nameById.keys());
  if (projectIds.length === 0) return { columns: timeColumns(), rows: [] };

  let q = supabase
    .from('time_entries')
    .select('project_id, start_time, total_hours, description')
    .in('project_id', projectIds);
  if (filters.startDate) q = q.gte('start_time', filters.startDate);
  if (filters.endDate) q = q.lte('start_time', `${filters.endDate}T23:59:59`);
  const { data, error } = await q.order('start_time', { ascending: false }).limit(5000);
  if (error) throw new Error(error.message);
  return {
    columns: timeColumns(),
    rows: (data ?? []).map((t) => ({
      date: dateOnly(t.start_time),
      project: nameById.get(t.project_id) ?? '',
      hours: t.total_hours ?? 0,
      description: t.description ?? '',
    })),
  };
}

const timeColumns = () => [
  { key: 'date', header: 'Date' },
  { key: 'project', header: 'Project' },
  { key: 'hours', header: 'Hours' },
  { key: 'description', header: 'Description' },
];

async function equipment(companyId: string): Promise<TableData> {
  const { data, error } = await supabase
    .from('equipment')
    .select('name, equipment_type, status, current_value, location, next_maintenance_date')
    .eq('company_id', companyId)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return {
    columns: [
      { key: 'name', header: 'Equipment' },
      { key: 'type', header: 'Type' },
      { key: 'status', header: 'Status' },
      { key: 'value', header: 'Current Value' },
      { key: 'location', header: 'Location' },
      { key: 'maintenance', header: 'Next Maintenance' },
    ],
    rows: (data ?? []).map((e) => ({
      name: e.name ?? '',
      type: e.equipment_type ?? '',
      status: e.status ?? '',
      value: money(e.current_value),
      location: e.location ?? '',
      maintenance: dateOnly(e.next_maintenance_date),
    })),
  };
}

async function aging(companyId: string): Promise<TableData> {
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number, amount_due, due_date, status')
    .eq('company_id', companyId)
    .neq('status', 'paid')
    .order('due_date', { ascending: true });
  if (error) throw new Error(error.message);
  const now = Date.now();
  return {
    columns: [
      { key: 'number', header: 'Invoice #' },
      { key: 'due', header: 'Due Date' },
      { key: 'amount', header: 'Amount Due' },
      { key: 'days', header: 'Days Overdue' },
      { key: 'bucket', header: 'Aging Bucket' },
    ],
    rows: (data ?? [])
      .filter((i) => (i.amount_due ?? 0) > 0)
      .map((i) => {
        const days = i.due_date
          ? Math.floor((now - new Date(`${dateOnly(i.due_date)}T00:00:00Z`).getTime()) / 86400000)
          : 0;
        return {
          number: i.invoice_number ?? '',
          due: dateOnly(i.due_date),
          amount: money(i.amount_due),
          days: Math.max(0, days),
          bucket: agingBucket(days),
        };
      }),
  };
}

function agingBucket(days: number): string {
  if (days <= 0) return 'Current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

// ---- History + schedules ----

export async function recordExport(params: {
  companyId: string;
  template: string;
  format: ExportFormat;
  filters: ReportFilters;
  rowCount: number;
}): Promise<void> {
  const { error } = await supabase.from('export_history').insert([
    {
      company_id: params.companyId,
      template: params.template,
      format: params.format,
      filters: params.filters as unknown as Json,
      row_count: params.rowCount,
    },
  ]);
  if (error) throw new Error(error.message);
}

export async function fetchExportHistory(companyId: string): Promise<ExportHistoryRow[]> {
  const { data, error } = await supabase
    .from('export_history')
    .select('id, template, format, filters, row_count, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    template: r.template,
    format: r.format,
    filters: (r.filters ?? {}) as ReportFilters,
    row_count: r.row_count,
    created_at: r.created_at,
  }));
}

export async function createSchedule(params: {
  companyId: string;
  name: string;
  template: string;
  format: ExportFormat;
  filters: ReportFilters;
  frequency: ScheduleFrequency;
  recipients: string[];
  startDate: string;
}): Promise<void> {
  const { error } = await supabase.from('scheduled_reports').insert([
    {
      company_id: params.companyId,
      name: params.name,
      template: params.template,
      format: params.format,
      filters: params.filters as unknown as Json,
      frequency: params.frequency,
      recipients: params.recipients,
      start_date: params.startDate,
      next_run_at: nextRunDate(params.frequency, params.startDate),
    },
  ]);
  if (error) throw new Error(error.message);
}

export async function fetchSchedules(companyId: string): Promise<ScheduledReport[]> {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('id, name, template, format, frequency, recipients, start_date, next_run_at, is_active')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledReport[];
}

export async function deleteSchedule(id: string, companyId: string): Promise<void> {
  const { error } = await supabase.from('scheduled_reports').delete().eq('id', id).eq('company_id', companyId);
  if (error) throw new Error(error.message);
}
