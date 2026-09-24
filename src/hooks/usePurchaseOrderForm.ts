/**
 * Pickers, the purchase order being edited, and its save, for
 * PurchaseOrderForm (US-266).
 *
 * The form read three pickers and the order itself from effects. Saving an
 * edit sent the create payload, po_number: '' included; the numbering trigger
 * only runs BEFORE INSERT, so every edit blanked the order's PO number (and
 * rewrote created_by to whoever edited it). An edit now sends only what the
 * form changes. An update RLS filtered to zero rows fails before the line
 * items are touched, instead of deleting the lines of an order that was not
 * updated.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface POLineItem {
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  unit_of_measure: string;
  cost_code_id?: string | null;
  notes?: string | null;
}

export interface POFormData {
  vendor_id: string;
  project_id: string;
  po_date: string;
  delivery_date: string;
  delivery_address: string;
  notes: string;
  terms: string;
  tax_rate: number;
  shipping_cost: number;
}

export interface POPickers {
  vendors: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

export const purchaseOrderFormKey = (companyId: string | undefined) => ['purchase-order-form', companyId] as const;
/** Shares the purchase-orders prefix so a save refreshes the list. */
export const purchaseOrdersKey = (companyId: string | undefined) => ['purchase-orders', companyId] as const;

export async function fetchPOPickers(companyId: string): Promise<POPickers> {
  // The form has no cost-code picker (lines keep the code they were saved
  // with), so cost codes are not read here.
  const [vendors, projects] = await Promise.all([
    supabase.from('vendors').select('id, name').eq('company_id', companyId).eq('is_active', true).order('name'),
    supabase.from('projects').select('id, name').eq('company_id', companyId).order('name'),
  ]);
  const failed = [vendors, projects].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    vendors: (vendors.data ?? []) as POPickers['vendors'],
    projects: (projects.data ?? []) as POPickers['projects'],
  };
}

export async function fetchPurchaseOrder(id: string): Promise<{ form: POFormData; lines: POLineItem[] }> {
  const [po, items] = await Promise.all([
    supabase.from('purchase_orders').select('*').eq('id', id).single(),
    supabase.from('purchase_order_line_items').select('*').eq('purchase_order_id', id).order('line_number'),
  ]);
  if (po.error) throw po.error;
  if (items.error) throw items.error;
  const p = po.data;
  return {
    form: {
      vendor_id: p.vendor_id,
      project_id: p.project_id || '',
      po_date: p.po_date,
      delivery_date: p.delivery_date || '',
      delivery_address: p.delivery_address || '',
      notes: p.notes || '',
      terms: p.terms || '',
      tax_rate: p.tax_rate || 0,
      shipping_cost: p.shipping_cost || 0,
    },
    lines: (items.data ?? []).map((item) => ({
      line_number: item.line_number,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_of_measure: item.unit_of_measure ?? 'each',
      cost_code_id: item.cost_code_id,
      notes: item.notes,
    })),
  };
}

export function poTotals(lines: POLineItem[], taxRate: number, shipping: number) {
  const subtotal = lines.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount + shipping };
}

/** Saves the order and replaces its lines; resolves with the order id. */
export async function savePurchaseOrder(args: {
  id: string | null;
  companyId: string;
  userId: string | undefined;
  form: POFormData;
  lines: POLineItem[];
  status: string;
}): Promise<string> {
  const { id, companyId, userId, form, lines, status } = args;
  const { subtotal, taxAmount, total } = poTotals(lines, form.tax_rate, form.shipping_cost);
  const fields = {
    vendor_id: form.vendor_id,
    project_id: form.project_id || null,
    po_date: form.po_date,
    delivery_date: form.delivery_date || null,
    delivery_address: form.delivery_address || null,
    notes: form.notes || null,
    terms: form.terms || null,
    subtotal,
    tax_rate: form.tax_rate,
    tax_amount: taxAmount,
    shipping_cost: form.shipping_cost,
    total_amount: total,
    status,
  };

  let poId: string;
  if (id) {
    const { data, error } = await supabase.from('purchase_orders').update(fields).eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('The purchase order was not updated. You may not have permission to edit it.');
    }
    poId = id;
    const { error: deleteError } = await supabase.from('purchase_order_line_items').delete().eq('purchase_order_id', id);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase
      .from('purchase_orders')
      // po_number '' is replaced by the BEFORE INSERT numbering trigger.
      .insert({ ...fields, company_id: companyId, po_number: '', created_by: userId })
      .select('id')
      .single();
    if (error) throw error;
    poId = data.id;
  }

  const { data: saved, error: itemsError } = await supabase
    .from('purchase_order_line_items')
    .insert(lines.map((item, index) => ({
      purchase_order_id: poId,
      line_number: index + 1,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_of_measure: item.unit_of_measure,
      cost_code_id: item.cost_code_id || null,
      notes: item.notes || null,
    })))
    .select('id');
  if (itemsError) throw new Error(`The purchase order was saved but its line items were not: ${itemsError.message}`);
  if ((saved ?? []).length !== lines.length) {
    throw new Error(`The purchase order was saved but only ${(saved ?? []).length} of ${lines.length} line items were.`);
  }
  return poId;
}

export function usePurchaseOrderForm(id: string | undefined) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const pickers = useQuery({
    queryKey: [...purchaseOrderFormKey(companyId), 'pickers'],
    queryFn: () => fetchPOPickers(companyId as string),
    enabled: !!companyId,
  });
  const order = useQuery({
    queryKey: [...purchaseOrdersKey(companyId), 'order', id],
    queryFn: () => fetchPurchaseOrder(id as string),
    enabled: !!companyId && !!id,
  });

  const save = useMutation({
    mutationFn: ({ form, lines, status }: { form: POFormData; lines: POLineItem[]; status: string }) => {
      if (!companyId) throw new Error('Your account is not linked to a company.');
      return savePurchaseOrder({ id: id ?? null, companyId, userId: userProfile?.id, form, lines, status });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: purchaseOrdersKey(companyId) }),
  });

  return {
    pickers,
    order,
    save: (form: POFormData, lines: POLineItem[], status: string) => save.mutateAsync({ form, lines, status }),
    saving: save.isPending,
  };
}
