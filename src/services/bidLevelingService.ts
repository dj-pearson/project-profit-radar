import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/services/auditService';
import type { BidScopeItem, BidInfo, BidLineItem } from '@/lib/bid-leveling';

/**
 * US-232: persistence for bid leveling (packages, shared scope, bids, quoted
 * line items, awardee selection). All reads/writes are company_id-scoped for
 * site isolation (in addition to RLS). Awards are audit-logged.
 */

export interface BidPackage {
  id: string;
  name: string;
  description: string | null;
  status: string;
  project_id: string;
  estimate_id: string | null;
}

export interface LevelingData {
  scopeItems: BidScopeItem[];
  bids: BidInfo[];
  lineItems: BidLineItem[];
}

export async function fetchPackages(projectId: string, companyId: string): Promise<BidPackage[]> {
  const { data, error } = await supabase
    .from('bid_packages')
    .select('id, name, description, status, project_id, estimate_id')
    .eq('company_id', companyId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BidPackage[];
}

export async function createPackage(params: {
  companyId: string;
  projectId: string;
  name: string;
  description?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('bid_packages').insert([
    {
      company_id: params.companyId,
      project_id: params.projectId,
      name: params.name,
      description: params.description ?? null,
    },
  ]);
  if (error) throw new Error(error.message);
}

export async function deletePackage(id: string, companyId: string): Promise<void> {
  const { error } = await supabase.from('bid_packages').delete().eq('id', id).eq('company_id', companyId);
  if (error) throw new Error(error.message);
}

/** Load everything needed to render the leveling matrix for a package. */
export async function fetchLevelingData(packageId: string, companyId: string): Promise<LevelingData> {
  const [scopeRes, bidsRes] = await Promise.all([
    supabase
      .from('bid_scope_items')
      .select('id, description, quantity, unit, estimate_amount, sort_order')
      .eq('company_id', companyId)
      .eq('package_id', packageId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('bids')
      .select('id, vendor_name, is_awarded')
      .eq('company_id', companyId)
      .eq('package_id', packageId)
      .order('created_at', { ascending: true }),
  ]);
  if (scopeRes.error) throw new Error(scopeRes.error.message);
  if (bidsRes.error) throw new Error(bidsRes.error.message);

  const bids = (bidsRes.data ?? []) as BidInfo[];
  let lineItems: BidLineItem[] = [];
  if (bids.length) {
    const { data, error } = await supabase
      .from('bid_line_items')
      .select('bid_id, scope_item_id, amount, included')
      .eq('company_id', companyId)
      .in('bid_id', bids.map((b) => b.id));
    if (error) throw new Error(error.message);
    lineItems = (data ?? []) as BidLineItem[];
  }

  return { scopeItems: (scopeRes.data ?? []) as BidScopeItem[], bids, lineItems };
}

/** Guard a financial/quantity value at the service boundary (UI min= is only a hint). */
function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
}

export async function createScopeItem(params: {
  companyId: string;
  packageId: string;
  description: string;
  quantity: number;
  unit?: string | null;
  estimateAmount: number;
  sortOrder?: number;
}): Promise<void> {
  assertNonNegativeFinite(params.quantity, 'Quantity');
  assertNonNegativeFinite(params.estimateAmount, 'Estimate amount');
  const { error } = await supabase.from('bid_scope_items').insert([
    {
      company_id: params.companyId,
      package_id: params.packageId,
      description: params.description,
      quantity: params.quantity,
      unit: params.unit ?? null,
      estimate_amount: params.estimateAmount,
      sort_order: params.sortOrder ?? 0,
    },
  ]);
  if (error) throw new Error(error.message);
}

export async function deleteScopeItem(id: string, companyId: string): Promise<void> {
  const { error } = await supabase.from('bid_scope_items').delete().eq('id', id).eq('company_id', companyId);
  if (error) throw new Error(error.message);
}

export async function createBid(params: {
  companyId: string;
  packageId: string;
  vendorName: string;
  vendorId?: string | null;
}): Promise<void> {
  // If a vendor is linked, verify it belongs to this company (vendor_id is a
  // single-column FK; this guards against a cross-company vendor reference).
  if (params.vendorId) {
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', params.vendorId)
      .eq('company_id', params.companyId)
      .maybeSingle();
    if (vendorError) throw new Error(vendorError.message);
    if (!vendor) throw new Error('Selected vendor does not belong to this company');
  }
  const { error } = await supabase.from('bids').insert([
    {
      company_id: params.companyId,
      package_id: params.packageId,
      vendor_name: params.vendorName,
      vendor_id: params.vendorId ?? null,
    },
  ]);
  if (error) throw new Error(error.message);
}

export async function deleteBid(id: string, companyId: string): Promise<void> {
  const { error } = await supabase.from('bids').delete().eq('id', id).eq('company_id', companyId);
  if (error) throw new Error(error.message);
}

/** Upsert a vendor's quote for a scope line (null amount = scope gap). */
export async function setLineAmount(params: {
  companyId: string;
  packageId: string;
  bidId: string;
  scopeItemId: string;
  amount: number | null;
}): Promise<void> {
  if (params.amount != null) assertNonNegativeFinite(params.amount, 'Bid amount');
  const { error } = await supabase.from('bid_line_items').upsert(
    [
      {
        company_id: params.companyId,
        package_id: params.packageId,
        bid_id: params.bidId,
        scope_item_id: params.scopeItemId,
        amount: params.amount,
        included: params.amount != null,
      },
    ],
    { onConflict: 'bid_id,scope_item_id' }
  );
  if (error) throw new Error(error.message);
}

/**
 * Award a package to a bid: mark the chosen bid awarded (others not), set the
 * package status to 'awarded', and audit-log. The award is recorded on the bid
 * so it can seed a subcontract/PO.
 */
export async function awardBid(params: {
  companyId: string;
  packageId: string;
  bidId: string;
  vendorName: string;
  userId: string;
}): Promise<void> {
  const { companyId, packageId, bidId, vendorName, userId } = params;

  // Single transactional RPC: validates the bid belongs to the package, clears
  // any prior award, sets the chosen bid, and flips package status — atomically.
  const { error } = await supabase.rpc('award_bid', {
    p_package_id: packageId,
    p_bid_id: bidId,
  });
  if (error) throw new Error(error.message);

  try {
    await logAuditEvent({
      userId,
      companyId,
      actionType: 'award',
      resourceType: 'bid',
      resourceId: bidId,
      resourceName: vendorName,
      newValues: { is_awarded: true, package_id: packageId },
      riskLevel: 'medium',
      complianceCategory: 'financial',
      description: `Awarded bid package to ${vendorName}.`,
    });
  } catch (err) {
    logger.error('Failed to audit-log bid award', err as Error);
  }
}
