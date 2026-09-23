/**
 * Reads and the release write behind the Retainage tab (US-266, US-327).
 *
 * RetentionManager read project_retainage and the project contacts together
 * and, when either failed, toasted and rendered whatever came back: a failed
 * retainage read said "No retainage is being held", and a failed contact read
 * let a release invoice go out addressed to "Unknown client". Either failure
 * now fails the read and the tab shows the error.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { invoicesKey } from '@/hooks/useInvoiceList';
import { insertInvoiceWithLines } from '@/hooks/invoiceWithLines';

export interface RetainageRow {
  project_id: string;
  project_name: string;
  retainage_percentage: number;
  contract_value: number;
  withheld_to_date: number;
  released_to_date: number;
  retainage_balance: number;
}

export interface RetainageProjectContact {
  id: string;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  status: string | null;
}

export interface RetainageData {
  rows: RetainageRow[];
  contacts: Record<string, RetainageProjectContact>;
}

export const retainageKey = (companyId: string | undefined) => ['project-retainage', companyId] as const;

export async function fetchRetainage(companyId: string): Promise<RetainageData> {
  const [retainage, projects] = await Promise.all([
    supabase
      .from('project_retainage')
      .select('project_id, project_name, retainage_percentage, contract_value, withheld_to_date, released_to_date, retainage_balance')
      .eq('company_id', companyId)
      .gt('withheld_to_date', 0)
      .order('retainage_balance', { ascending: false }),
    supabase
      .from('projects')
      .select('id, client_id, client_name, client_email, status')
      .eq('company_id', companyId),
  ]);
  if (retainage.error) throw retainage.error;
  if (projects.error) throw projects.error;
  return {
    rows: (retainage.data ?? []) as RetainageRow[],
    contacts: Object.fromEntries(
      ((projects.data ?? []) as RetainageProjectContact[]).map((p) => [p.id, p]),
    ),
  };
}

const EMPTY: RetainageData = { rows: [], contacts: {} };

export function useRetainageRelease() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: retainageKey(companyId),
    queryFn: () => fetchRetainage(companyId as string),
    enabled: !!companyId,
  });

  const createInvoice = useMutation({
    mutationFn: ({ header, lines }: {
      header: Record<string, unknown>;
      lines: (invoiceId: string) => Record<string, unknown>[];
    }) => insertInvoiceWithLines(header, lines),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: retainageKey(companyId) });
      void queryClient.invalidateQueries({ queryKey: invoicesKey(companyId) });
    },
  });

  const data = query.data ?? EMPTY;
  return {
    rows: data.rows,
    contacts: data.contacts,
    isLoading: query.isLoading || !companyId,
    error: query.error as Error | null,
    refetch: query.refetch,
    createInvoice,
  };
}
