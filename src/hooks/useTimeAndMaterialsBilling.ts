/**
 * Reads and the invoice write behind the Time and materials tab (US-266, US-327).
 *
 * TimeAndMaterialsBilling read projects and unbilled work in useEffects. A
 * failed project read was logged and left the picker empty; a failed work read
 * toasted and then said "Nothing is waiting to be billed", which is the one
 * thing the screen must not say about hours that are waiting. Both read through
 * these queries now and the tab shows the error.
 *
 * The write is the same sequence as before: header and lines through
 * insertInvoiceWithLines (header rolled back if the lines fail), then the source rows stamped with the invoice id. The stamps
 * select their ids back so a stamp RLS filtered to zero rows is reported, since
 * an unstamped hour is billed again next month.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import type { UnbilledWorkRow } from '@/lib/progressBilling';
import { invoicesKey } from '@/hooks/useInvoiceList';
import { insertInvoiceWithLines } from '@/hooks/invoiceWithLines';

export interface TmProjectRow {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
}

export interface TmBillableLine extends UnbilledWorkRow {
  lineTotal: number;
}

export interface TmInvoiceInput {
  companyId: string;
  project: TmProjectRow;
  billable: TmBillableLine[];
  total: number;
  dueDate: string;
  terms: string;
}

export interface TmInvoiceResult {
  invoiceNumber: string;
  /** Set when the invoice exists but the source rows were not all marked billed. */
  stampError: string | null;
}

export const tmProjectsKey = (companyId: string | undefined) => ['projects', companyId, 'tm-billing'] as const;
export const unbilledWorkKey = (companyId: string | undefined, projectId: string) =>
  ['project-unbilled-work', companyId, projectId] as const;

export async function fetchTmProjects(companyId: string): Promise<TmProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, client_id, client_name, client_email')
    .eq('company_id', companyId)
    .in('status', ['active', 'planning', 'completed'])
    .order('name');
  if (error) throw error;
  return (data ?? []) as TmProjectRow[];
}

export async function fetchUnbilledWork(projectId: string): Promise<UnbilledWorkRow[]> {
  const { data, error } = await supabase
    .from('project_unbilled_work')
    .select('source_type, source_id, description, work_date, quantity, unit_price, cost_code_id')
    .eq('project_id', projectId)
    .order('work_date');
  if (error) throw error;
  return (data ?? []) as UnbilledWorkRow[];
}

async function stamp(table: 'time_entries' | 'expenses', ids: string[], invoiceId: string): Promise<string | null> {
  if (ids.length === 0) return null;
  const { data, error } = await supabase
    .from(table)
    .update({ billed_invoice_id: invoiceId } as never)
    .in('id', ids)
    .select('id');
  if (error) return error.message;
  const got = data?.length ?? 0;
  return got < ids.length ? `${ids.length - got} of ${ids.length} ${table === 'time_entries' ? 'time entries' : 'expenses'} could not be updated` : null;
}

export async function createTimeAndMaterialsInvoice(input: TmInvoiceInput): Promise<TmInvoiceResult> {
  const { companyId, project, billable, total, dueDate, terms } = input;
  const header = await insertInvoiceWithLines(
    {
      company_id: companyId,
      project_id: project.id,
      client_id: project.client_id,
      client_name: project.client_name || 'Unknown client',
      client_email: project.client_email || '',
      invoice_type: 'time_and_materials',
      subtotal: total,
      total_amount: total,
      amount_due: total,
      current_amount_due: total,
      due_date: dueDate,
      notes: `Time and materials: ${billable.length} item(s)`,
      terms,
    },
    (invoiceId) => billable.map((row) => ({
      invoice_id: invoiceId,
      cost_code_id: row.cost_code_id ?? null,
      description: `${row.work_date} - ${row.description}`,
      quantity: row.quantity,
      unit_price: row.unit_price as number,
      total_price: row.lineTotal,
    })),
  );

  // Stamp the sources. Until this runs the same hours are still billable,
  // which is the safe direction: a failure here means the work can be
  // billed again, not that it was silently lost.
  const timeIds = billable.filter((r) => r.source_type === 'time').map((r) => r.source_id);
  const expenseIds = billable.filter((r) => r.source_type === 'expense').map((r) => r.source_id);
  const stamps = await Promise.all([
    stamp('time_entries', timeIds, header.id),
    stamp('expenses', expenseIds, header.id),
  ]);
  const stampError = stamps.find((s) => s) ?? null;
  if (stampError) logger.error('T&M invoice created but sources were not marked billed', stampError);

  return { invoiceNumber: header.invoice_number, stampError };
}

// Stable while there is no data, so a caller that resets state on a new list
// does not reset on every render.
const NO_ROWS: UnbilledWorkRow[] = [];
const NO_PROJECTS: TmProjectRow[] = [];

export function useTimeAndMaterialsBilling(selectedProjectId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const projects = useQuery({
    queryKey: tmProjectsKey(companyId),
    queryFn: () => fetchTmProjects(companyId as string),
    enabled: !!companyId,
  });
  const work = useQuery({
    queryKey: unbilledWorkKey(companyId, selectedProjectId),
    queryFn: () => fetchUnbilledWork(selectedProjectId),
    enabled: !!companyId && !!selectedProjectId,
  });

  const createInvoice = useMutation({
    mutationFn: createTimeAndMaterialsInvoice,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-unbilled-work', companyId] });
      void queryClient.invalidateQueries({ queryKey: invoicesKey(companyId) });
    },
  });

  return {
    projects: projects.data ?? NO_PROJECTS,
    projectsError: projects.error as Error | null,
    refetchProjects: projects.refetch,
    rows: work.data ?? NO_ROWS,
    loadingRows: work.isLoading && !!selectedProjectId,
    rowsError: work.error as Error | null,
    refetchRows: work.refetch,
    createInvoice,
  };
}
