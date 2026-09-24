/**
 * Inventory, purchase orders and the project picker for /materials (US-266).
 *
 * The Purchase Orders tab was a hardcoded array (PO-001 from "BuildCo
 * Supply", PO-002 from "Metal Masters", both dated 2024), and the Reports tab
 * showed "$18,125.00", "+5.2% from last month", "1" low stock item and "1"
 * pending order whatever the company held. The materials and projects reads
 * had no company filter (RLS alone scoped them), and creating a material
 * looked the company up through a second auth round trip.
 *
 * Orders are the company's purchase_orders now, and the report cards are
 * computed from the same reads. There is no month-over-month figure, so none
 * is shown. Reads throw; the insert selects its row back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert } from '@/integrations/supabase/types';
import { purchaseOrdersKey } from './usePurchaseOrderForm';

export interface InventoryMaterial {
  id: string;
  name: string;
  material_code: string | null;
  category: string | null;
  unit: string | null;
  quantity_available: number | null;
  minimum_stock_level: number | null;
  unit_cost: number | null;
  supplier_name: string | null;
  description: string | null;
  projects?: { name: string } | null;
}

export interface InventoryOrder {
  id: string;
  po_number: string;
  vendor_name: string | null;
  po_date: string;
  delivery_date: string | null;
  status: string;
  total_amount: number;
  items_count: number;
}

/** Statuses PurchaseOrders.tsx counts as not yet closed out. */
export const PENDING_PO_STATUSES = ['draft', 'sent'];

export const materialsInventoryKey = (companyId: string | undefined) => ['materials-inventory', companyId] as const;

export function inventorySummary(materials: InventoryMaterial[], orders: InventoryOrder[]) {
  return {
    totalValue: materials.reduce((sum, m) => sum + (m.quantity_available || 0) * (m.unit_cost || 0), 0),
    lowStock: materials.filter((m) => (m.quantity_available || 0) <= (m.minimum_stock_level || 0)).length,
    pendingOrders: orders.filter((o) => PENDING_PO_STATUSES.includes(o.status)).length,
  };
}

export async function fetchMaterialsInventory(companyId: string): Promise<{
  materials: InventoryMaterial[];
  orders: InventoryOrder[];
  projects: { id: string; name: string }[];
}> {
  const [materials, orders, projects] = await Promise.all([
    supabase.from('materials').select('*, projects(name)').eq('company_id', companyId).order('name'),
    supabase
      .from('purchase_orders')
      .select('id, po_number, po_date, delivery_date, status, total_amount, vendors(name), purchase_order_line_items(count)')
      .eq('company_id', companyId)
      .order('po_date', { ascending: false })
      .limit(50),
    supabase.from('projects').select('id, name').eq('company_id', companyId).order('name'),
  ]);
  const failed = [materials, orders, projects].find((r) => r.error)?.error;
  if (failed) throw failed;

  return {
    materials: (materials.data ?? []) as unknown as InventoryMaterial[],
    orders: ((orders.data ?? []) as Record<string, unknown>[]).map((o) => {
      const lines = o.purchase_order_line_items;
      return {
        id: String(o.id),
        po_number: String(o.po_number ?? ''),
        vendor_name: (o.vendors as { name?: string } | null)?.name ?? null,
        po_date: String(o.po_date),
        delivery_date: (o.delivery_date as string | null) ?? null,
        status: String(o.status),
        total_amount: Number(o.total_amount) || 0,
        items_count: Array.isArray(lines) && lines[0] ? Number((lines[0] as { count?: number }).count) || 0 : 0,
      };
    }),
    projects: (projects.data ?? []) as { id: string; name: string }[],
  };
}

export async function createInventoryMaterial(row: TablesInsert<'materials'>): Promise<void> {
  const { data, error } = await supabase.from('materials').insert(row).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The material was not added. You may not have permission to add materials.');
  }
}

export function useMaterialsInventory() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = materialsInventoryKey(companyId);

  const query = useQuery({ queryKey: key, queryFn: () => fetchMaterialsInventory(companyId as string), enabled: !!companyId });
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: purchaseOrdersKey(companyId) }),
    ]);

  const create = useMutation({
    mutationFn: (row: Omit<TablesInsert<'materials'>, 'company_id'>) => {
      if (!companyId) throw new Error('Your account is not linked to a company.');
      return createInventoryMaterial({ ...row, company_id: companyId });
    },
    onSettled: invalidate,
  });

  return {
    materials: query.data?.materials ?? [],
    orders: query.data?.orders ?? [],
    projects: query.data?.projects ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    invalidate,
    create: (row: Omit<TablesInsert<'materials'>, 'company_id'>) => create.mutateAsync(row),
  };
}
