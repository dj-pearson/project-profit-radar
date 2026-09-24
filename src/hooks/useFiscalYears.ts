/**
 * Fiscal years and their monthly periods for /finance/fiscal-periods (US-266).
 *
 * The page took its company from user.user_metadata.company_id, which the
 * signup paths do not set, so for most users every query was disabled and the
 * page showed "0 fiscal years" and a Create button that inserted a row with no
 * company. It reads userProfile.company_id now.
 *
 * Creating a year inserted the periods without reading them back, and a
 * failed period insert left a year with no periods that could not be
 * re-created (year_number is unique per company). The year is removed again
 * when its periods do not all land. Closing and reopening a period are scoped
 * to the company and throw when no row changed.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generateMonthlyPeriods } from '@/utils/accountingUtils';

export interface FiscalYear {
  id: string;
  company_id: string;
  year_number: number;
  start_date: string;
  end_date: string;
  is_closed: boolean | null;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FiscalPeriodRow {
  id: string;
  fiscal_year_id: string;
  company_id: string;
  period_number: number;
  period_name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean | null;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  fiscal_year?: { year_number: number } | null;
}

export interface NewFiscalYear {
  yearNumber: number;
  startDate: string;
  endDate: string;
}

export const fiscalYearsKey = (companyId: string | undefined) => ['fiscal-years', companyId] as const;
export const fiscalPeriodsAllKey = (companyId: string | undefined) => ['fiscal-periods-all', companyId] as const;

export async function fetchFiscalYears(companyId: string): Promise<FiscalYear[]> {
  const { data, error } = await supabase
    .from('fiscal_years')
    .select('*')
    .eq('company_id', companyId)
    .order('year_number', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FiscalYear[];
}

export async function fetchAllFiscalPeriods(companyId: string): Promise<FiscalPeriodRow[]> {
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select('*, fiscal_year:fiscal_years(year_number)')
    .eq('company_id', companyId)
    .order('start_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as FiscalPeriodRow[];
}

export async function createFiscalYear(companyId: string, v: NewFiscalYear): Promise<FiscalYear> {
  const { data: year, error: yearError } = await supabase
    .from('fiscal_years')
    .insert({
      company_id: companyId,
      year_number: v.yearNumber,
      start_date: v.startDate,
      end_date: v.endDate,
    })
    .select()
    .single();
  if (yearError) throw yearError;
  if (!year) throw new Error('The fiscal year was not created.');

  const periods = generateMonthlyPeriods(new Date(v.startDate), new Date(v.endDate)).map((p) => ({
    fiscal_year_id: year.id,
    company_id: companyId,
    period_number: p.periodNumber,
    period_name: p.periodName,
    start_date: p.startDate.toISOString().split('T')[0],
    end_date: p.endDate.toISOString().split('T')[0],
  }));

  const { data: inserted, error: periodsError } = await supabase
    .from('fiscal_periods')
    .insert(periods)
    .select('id');
  const landed = inserted?.length ?? 0;
  if (periodsError || landed !== periods.length) {
    // A year without its periods cannot be fixed from this page, and its
    // year_number blocks creating it again; take it back out.
    // Any periods that did land go first; a failure there is reported below
    // through the year delete, which their foreign key then refuses.
    const { error: periodsUndoError } = await supabase
      .from('fiscal_periods')
      .delete()
      .eq('fiscal_year_id', year.id)
      .eq('company_id', companyId);
    const { error: yearUndoError } = await supabase
      .from('fiscal_years')
      .delete()
      .eq('id', year.id)
      .eq('company_id', companyId);
    const undoError = periodsUndoError ?? yearUndoError;
    const why = periodsError?.message ?? `only ${landed} of ${periods.length} periods were saved`;
    throw new Error(
      undoError
        ? `The periods were not created (${why}), and the empty fiscal year could not be removed: ${undoError.message}`
        : `The periods were not created (${why}). Nothing was saved.`,
    );
  }
  return year as FiscalYear;
}

export async function setFiscalPeriodClosed(
  companyId: string,
  periodId: string,
  closed: boolean,
  userId: string | undefined,
): Promise<void> {
  const patch = closed
    ? { is_closed: true, closed_at: new Date().toISOString(), closed_by: userId ?? null }
    : { is_closed: false, closed_at: null, closed_by: null };
  const { data, error } = await supabase
    .from('fiscal_periods')
    .update(patch)
    .eq('id', periodId)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No period was changed. It may have been removed, or you may not have permission.');
  }
}

export function useFiscalYears() {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const years = useQuery({
    queryKey: fiscalYearsKey(companyId),
    queryFn: () => fetchFiscalYears(companyId as string),
    enabled: !!companyId,
  });
  const periods = useQuery({
    queryKey: fiscalPeriodsAllKey(companyId),
    queryFn: () => fetchAllFiscalPeriods(companyId as string),
    enabled: !!companyId,
  });

  const need = () => {
    if (!companyId) throw new Error('Your profile is not linked to a company.');
    return companyId;
  };
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: fiscalYearsKey(companyId) });
    void queryClient.invalidateQueries({ queryKey: fiscalPeriodsAllKey(companyId) });
    // useAccounting's period pickers.
    void queryClient.invalidateQueries({ queryKey: ['fiscal-periods'] });
  };

  const create = useMutation({
    mutationFn: (v: NewFiscalYear) => createFiscalYear(need(), v),
    onSettled: invalidate,
  });
  const setClosed = useMutation({
    mutationFn: (v: { periodId: string; closed: boolean }) => setFiscalPeriodClosed(need(), v.periodId, v.closed, userId),
    onSettled: invalidate,
  });

  return { companyId, years, periods, create, setClosed };
}
