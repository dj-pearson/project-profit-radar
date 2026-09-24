/**
 * Pickers and saves behind the bond, permit, warranty and warranty-claim
 * dialogs (US-266).
 *
 * Each dialog read its own project (and vendor, purchase-order, warranty)
 * list in an effect. BondForm and PermitForm caught a failed read into
 * console.error; WarrantyForm did not look at the error at all. Either way the
 * picker showed an empty list with nothing said. Saves updated by id alone
 * and did not read back, so an update RLS filtered to zero rows toasted
 * "Bond Updated". The reads throw into the query now and each dialog says
 * which list failed; saves are scoped to the company and throw on zero rows.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Option {
  id: string;
  name: string;
}

export interface PurchaseOrderOption {
  id: string;
  po_number: string;
}

export interface WarrantyOption {
  id: string;
  item_name: string;
  manufacturer: string;
  project?: { name: string } | null;
}

export const recordFormProjectsKey = (companyId: string | undefined) =>
  ['record-forms', companyId, 'projects'] as const;
export const warrantyFormOptionsKey = (companyId: string | undefined) =>
  ['record-forms', companyId, 'warranty-options'] as const;
export const activeWarrantiesKey = (companyId: string | undefined) =>
  ['record-forms', companyId, 'active-warranties'] as const;

export async function fetchProjectOptions(companyId: string): Promise<Option[]> {
  const { data, error } = await supabase.from('projects').select('id, name').eq('company_id', companyId).order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchWarrantyFormOptions(
  companyId: string,
): Promise<{ vendors: Option[]; purchaseOrders: PurchaseOrderOption[] }> {
  const [vendors, pos] = await Promise.all([
    supabase.from('vendors').select('id, name').eq('company_id', companyId).order('name'),
    supabase.from('purchase_orders').select('id, po_number').eq('company_id', companyId),
  ]);
  const failed = [vendors, pos].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    vendors: (vendors.data ?? []) as Option[],
    purchaseOrders: (pos.data ?? []) as PurchaseOrderOption[],
  };
}

export async function fetchActiveWarranties(companyId: string): Promise<WarrantyOption[]> {
  const { data, error } = await supabase
    .from('warranties')
    .select('id, item_name, manufacturer, project:projects(name)')
    .eq('company_id', companyId)
    .eq('status', 'active');
  if (error) throw error;
  return (data ?? []) as unknown as WarrantyOption[];
}

export type RecordTable = 'bonds' | 'permits' | 'warranties' | 'warranty_claims';

/**
 * Insert (no id) or update (id) one company record and read it back. The
 * builders already set company_id on the rows that have one; the update is
 * also filtered by it, so an id from another company changes nothing and
 * says so.
 */
export async function saveCompanyRecord(
  companyId: string,
  table: RecordTable,
  id: string | undefined,
  row: Record<string, unknown>,
): Promise<void> {
  // The table is chosen at run time; the typed client only knows the columns
  // the four share, and company_id is not typed on all of them.
  const db = supabase as unknown as SupabaseClient;
  let res;
  if (id) {
    let update = db.from(table).update(row).eq('id', id);
    // warranty_claims has no company_id; it belongs to a company through its
    // warranty, which RLS checks. The other three carry the column.
    if (table !== 'warranty_claims') update = update.eq('company_id', companyId);
    res = await update.select('id');
  } else {
    res = await db.from(table).insert(row).select('id');
  }
  if (res.error) throw res.error;
  if (!res.data || res.data.length === 0) {
    throw new Error(
      id
        ? 'Nothing was updated. The record may have been removed, or you may not have permission.'
        : 'The record was not saved.',
    );
  }
}

export function useProjectOptions() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  return useQuery({
    queryKey: recordFormProjectsKey(companyId),
    queryFn: () => fetchProjectOptions(companyId as string),
    enabled: !!companyId,
  });
}

export function useWarrantyFormOptions() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  return useQuery({
    queryKey: warrantyFormOptionsKey(companyId),
    queryFn: () => fetchWarrantyFormOptions(companyId as string),
    enabled: !!companyId,
  });
}

export function useActiveWarranties() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  return useQuery({
    queryKey: activeWarrantiesKey(companyId),
    queryFn: () => fetchActiveWarranties(companyId as string),
    enabled: !!companyId,
  });
}

/** The parent list reloads through the dialog's onSave callback. */
export function useSaveCompanyRecord(table: RecordTable) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  return useMutation({
    mutationFn: (v: { id?: string; row: Record<string, unknown> }) => {
      if (!companyId) throw new Error('Your profile is not linked to a company.');
      return saveCompanyRecord(companyId, table, v.id, v.row);
    },
  });
}
