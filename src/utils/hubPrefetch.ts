import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/integrations/supabase/client';

/**
 * US-220: Navigation-aware warm-up for hub routes.
 *
 * When the user lands on a hub (or a high-traffic landing page), preload the
 * JS chunks for the likely-next routes AND warm the TanStack queries those
 * routes need, so first navigation into a hub's children doesn't pay both a
 * chunk-fetch and a cold data-fetch. Everything here is best-effort and
 * guarded — a failed preload/prefetch must never affect the running app.
 *
 * Each data prefetcher mirrors the page's primary useQuery (same key + a
 * minimal equivalent fetch) so the cache entry is reused on navigation.
 */

type Prefetcher = (qc: QueryClient, companyId: string) => Promise<unknown>;

const prefetchProjects: Prefetcher = (qc, companyId) =>
  qc.prefetchQuery({
    queryKey: [...queryKeys.projects],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select(
          'id,name,status,budget,start_date,end_date,completion_percentage,client_name,project_type,created_at,updated_at'
        )
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });
      return data ?? [];
    },
    staleTime: 3 * 60 * 1000,
  });

const prefetchInvoices: Prefetcher = (qc, companyId) =>
  qc.prefetchQuery({
    queryKey: [...queryKeys.invoices],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select(
          'id,invoice_number,amount,status,due_date,client_name,project_id,created_at'
        )
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

interface HubWarmup {
  /** Match the current pathname (prefix-style). */
  match: RegExp;
  /** Likely-next route chunks to preload. */
  chunks: Array<() => Promise<unknown>>;
  /** Queries to warm (require a company_id). */
  data: Prefetcher[];
}

/**
 * Registry of hub → likely-next routes. Extend by adding entries; each is
 * independent and additive.
 */
export const HUB_WARMUPS: HubWarmup[] = [
  {
    // Projects hub + the dashboard both fan out into project workflows.
    match: /^\/(projects-hub|projects|dashboard)(\/|$)/,
    chunks: [
      () => import('@/pages/Projects'),
      () => import('@/pages/ProjectDetail'),
      () => import('@/pages/DailyReports'),
    ],
    data: [prefetchProjects],
  },
  {
    // Financial hub fans out into invoices / financial dashboard / expenses.
    match: /^\/(financial-hub|invoices|financial-dashboard|expenses)(\/|$)/,
    chunks: [
      () => import('@/pages/Invoices'),
      () => import('@/pages/FinancialDashboard'),
      () => import('@/pages/Expenses'),
    ],
    data: [prefetchInvoices],
  },
];

/**
 * Warm chunks + data for whichever hub(s) match the given pathname.
 * Safe to call on every navigation — no-ops when nothing matches and never throws.
 */
export const warmForRoute = (
  pathname: string,
  queryClient: QueryClient,
  companyId?: string
): void => {
  const matches = HUB_WARMUPS.filter((h) => h.match.test(pathname));
  if (matches.length === 0) return;

  for (const hub of matches) {
    // Stagger chunk imports so they don't contend with the current render.
    hub.chunks.forEach((load, i) => {
      window.setTimeout(() => {
        load().catch(() => {
          /* preload is best-effort */
        });
      }, i * 150);
    });

    if (companyId) {
      for (const prefetch of hub.data) {
        prefetch(queryClient, companyId).catch(() => {
          /* prefetch is best-effort */
        });
      }
    }
  }
};
