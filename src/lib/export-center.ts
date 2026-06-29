/**
 * US-086: Export Center — pure, I/O-free helpers + metadata.
 *
 * Report templates, schedule math (next-run date), recipient parsing, and form
 * validation live here so they're unit-testable independent of Supabase, the
 * file-format libraries, and the UI.
 */

export type ExportFormat = 'csv' | 'excel' | 'pdf';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type ReportTemplateId = 'project-summary' | 'financial' | 'time' | 'equipment' | 'aging';

export interface ReportTemplate {
  id: ReportTemplateId;
  label: string;
  description: string;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'project-summary', label: 'Project Summary', description: 'Projects with status, budget, and completion.' },
  { id: 'financial', label: 'Financial', description: 'Invoices with totals and status.' },
  { id: 'time', label: 'Time', description: 'Time entries by project and date.' },
  { id: 'equipment', label: 'Equipment', description: 'Equipment inventory and status.' },
  { id: 'aging', label: 'AR Aging', description: 'Outstanding invoices by age bucket.' },
];

export const EXPORT_FORMATS: { id: ExportFormat; label: string; ext: string }[] = [
  { id: 'pdf', label: 'PDF', ext: 'pdf' },
  { id: 'excel', label: 'Excel (xlsx)', ext: 'xlsx' },
  { id: 'csv', label: 'CSV', ext: 'csv' },
];

export const FREQUENCIES: { id: ScheduleFrequency; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

/** A generic tabular report (format-agnostic). */
export interface TableColumn {
  key: string;
  header: string;
}
export interface TableData {
  columns: TableColumn[];
  rows: Record<string, string | number | null>[];
}

/**
 * Next run date (YYYY-MM-DD) for a schedule, computed from `fromISO` (the start
 * date or last run). Daily = +1 day, weekly = +7 days, monthly = +1 month
 * (clamped to end-of-month).
 */
export function nextRunDate(frequency: ScheduleFrequency, fromISO: string): string {
  const base = new Date(`${fromISO.slice(0, 10)}T00:00:00Z`);
  const d = new Date(base);
  if (frequency === 'daily') d.setUTCDate(d.getUTCDate() + 1);
  else if (frequency === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else {
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    // Clamp to the last day of the target month (e.g. Jan 31 -> Feb 28/29).
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, lastDay));
  }
  return d.toISOString().slice(0, 10);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse a comma/semicolon/whitespace-separated recipient string into unique valid emails. */
export function parseRecipients(raw: string): string[] {
  const parts = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(parts.filter((p) => EMAIL_RE.test(p))));
}

/** True when the string contains at least one token that isn't a valid email. */
export function hasInvalidRecipient(raw: string): boolean {
  const tokens = raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  return tokens.some((t) => !EMAIL_RE.test(t));
}

/** Validate a schedule-delivery form. Returns human-readable errors ([] = valid). */
export function validateSchedule(form: {
  name: string;
  frequency: ScheduleFrequency | '';
  recipientsRaw: string;
  startDate: string;
}): string[] {
  const errors: string[] = [];
  if (!form.name.trim()) errors.push('Schedule name is required.');
  if (!form.frequency) errors.push('Choose a frequency.');
  if (!form.startDate) errors.push('Choose a start date.');
  const recipients = parseRecipients(form.recipientsRaw);
  if (recipients.length === 0) errors.push('Add at least one valid recipient email.');
  else if (hasInvalidRecipient(form.recipientsRaw)) errors.push('One or more recipient emails are invalid.');
  return errors;
}
