/**
 * Reads and the approve write behind the Smart Procurement admin page (US-266).
 *
 * The page looked up tenant_id three times with unchecked reads and caught
 * every error into console.error, so a failed read showed "No pending
 * recommendations" and $0 potential savings. Approve reported nothing either
 * way, and an update RLS filtered to zero rows left the card in place with no
 * explanation. Reads throw now; approve selects the row back and throws on
 * zero rows.
 *
 * These tables are keyed by tenant_id. The cache key carries company_id and
 * the user id so one account's cache is never served to another.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTenantId } from './tenantScope';

export interface MaterialForecast {
  id: string;
  material_name: string;
  forecast_quantity: number;
  forecast_unit: string;
  confidence_score: number;
  estimated_lead_time_days: number;
  recommended_order_date: string;
}

export interface SupplierCatalogEntry {
  id: string;
  supplier_name: string;
  material_name: string;
  unit_price: number;
  lead_time_days: number;
  supplier_rating: number | null;
}

export interface PurchaseRecommendation {
  id: string;
  material_name: string;
  recommended_quantity: number;
  estimated_cost: number;
  estimated_savings: number;
  recommended_order_date: string;
  status: string;
  supplier_catalog: { supplier_name: string } | null;
}

export interface SmartProcurementData {
  tenantId: string | null;
  forecasts: MaterialForecast[];
  suppliers: SupplierCatalogEntry[];
  recommendations: PurchaseRecommendation[];
}

export const smartProcurementKey = (companyId: string | undefined, userId: string | undefined) =>
  ['smart-procurement', companyId, userId] as const;

export async function fetchSmartProcurement(userId: string, today: Date = new Date()): Promise<SmartProcurementData> {
  const tenantId = await fetchTenantId(userId);
  if (!tenantId) return { tenantId: null, forecasts: [], suppliers: [], recommendations: [] };

  const [forecasts, suppliers, recommendations] = await Promise.all([
    supabase
      .from('material_forecasts')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('forecast_date', today.toISOString().split('T')[0])
      .order('forecast_date')
      .limit(20),
    supabase
      .from('supplier_catalog')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('material_name'),
    supabase
      .from('purchase_recommendations')
      .select('*, supplier_catalog ( supplier_name )')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('recommended_order_date'),
  ]);
  const failed = [forecasts, suppliers, recommendations].find((r) => r.error)?.error;
  if (failed) throw failed;

  return {
    tenantId,
    forecasts: (forecasts.data ?? []) as unknown as MaterialForecast[],
    suppliers: (suppliers.data ?? []) as unknown as SupplierCatalogEntry[],
    recommendations: (recommendations.data ?? []) as unknown as PurchaseRecommendation[],
  };
}

export async function approvePurchaseRecommendation(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('purchase_recommendations')
    .update({ status: 'approved' })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The recommendation was not approved. You may not have permission to approve purchases.');
  }
}

export function useSmartProcurement() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = smartProcurementKey(companyId, userId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchSmartProcurement(userId as string),
    enabled: !!userId,
  });

  const approve = useMutation({
    mutationFn: approvePurchaseRecommendation,
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    approve: (id: string) => approve.mutateAsync(id),
  };
}
