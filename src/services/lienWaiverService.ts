import { supabase } from '@/integrations/supabase/client';
import {
  canTransition,
  type WaiverStatus,
  type WaiverType,
} from '@/lib/lien-waivers';

/**
 * US-227: Lien waiver persistence. All reads/writes are company_id-scoped for
 * tenant isolation; the project/contractor composite FKs enforce that a waiver
 * can only reference rows from the same company. Domain rules (allowed status
 * transitions, payment-hold resolution) live in lib/lien-waivers.
 */

export interface LienWaiver {
  id: string;
  company_id: string;
  project_id: string;
  contractor_id: string;
  waiver_type: string;
  status: string;
  amount: number;
  through_date: string;
  holds_payment: boolean;
  payment_id: string | null;
  signature: string | null;
  signed_by: string | null;
  signed_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface LienWaiverEvent {
  id: string;
  waiver_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
}

export interface CreateWaiverInput {
  companyId: string;
  projectId: string;
  contractorId: string;
  waiverType: WaiverType;
  amount: number;
  throughDate: string;
  holdsPayment: boolean;
  notes?: string;
}

const WAIVER_COLUMNS =
  'id, company_id, project_id, contractor_id, waiver_type, status, amount, through_date, holds_payment, payment_id, signature, signed_by, signed_at, received_at, notes, created_at';

/** List a company's active waivers, newest first. */
export async function fetchWaivers(companyId: string): Promise<LienWaiver[]> {
  const { data, error } = await supabase
    .from('lien_waivers')
    .select(WAIVER_COLUMNS)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LienWaiver[];
}

/**
 * Create a waiver request. The opening audit event is written atomically by the
 * lien_waivers AFTER INSERT trigger (no separate client round trip).
 */
export async function createWaiver(input: CreateWaiverInput): Promise<LienWaiver> {
  const { data, error } = await supabase
    .from('lien_waivers')
    .insert([
      {
        company_id: input.companyId,
        project_id: input.projectId,
        contractor_id: input.contractorId,
        waiver_type: input.waiverType,
        amount: input.amount,
        through_date: input.throughDate,
        holds_payment: input.holdsPayment,
        notes: input.notes ?? null,
        status: 'requested',
      },
    ])
    .select(WAIVER_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as LienWaiver;
}

/**
 * Advance a waiver to a new status. Enforces the allowed-transition rule and
 * guards the write with the expected current status so a stale client can't
 * clobber a row that changed underneath it. Marking 'signed' captures the
 * e-signature; 'received' stamps received_at (which releases any payment hold).
 * The status-change audit event is appended atomically by the trigger.
 */
export async function advanceWaiver(params: {
  companyId: string;
  waiver: LienWaiver;
  to: WaiverStatus;
  signature?: string | null;
  signedBy?: string | null;
}): Promise<void> {
  const { companyId, waiver, to } = params;
  const from = waiver.status as WaiverStatus;
  if (!canTransition(from, to)) {
    throw new Error(`Cannot move a waiver from "${from}" to "${to}".`);
  }

  const patch: Record<string, unknown> = { status: to };
  if (to === 'signed') {
    patch.signature = params.signature ?? waiver.signature ?? null;
    patch.signed_by = params.signedBy ?? waiver.signed_by ?? null;
    patch.signed_at = new Date().toISOString();
  }
  if (to === 'received') {
    patch.received_at = new Date().toISOString();
  }

  // Optimistic-concurrency guard: only update if the row is still in `from`.
  const { data, error } = await supabase
    .from('lien_waivers')
    .update(patch)
    .eq('id', waiver.id)
    .eq('company_id', companyId)
    .eq('status', from)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('This waiver was updated by someone else. Refresh and try again.');
  }
}

/**
 * Soft-delete a waiver (builder-only via RLS). Deactivates the row rather than
 * hard-deleting so its append-only audit trail is retained.
 */
export async function deleteWaiver(id: string, companyId: string): Promise<void> {
  const { error } = await supabase
    .from('lien_waivers')
    .update({ is_active: false })
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw new Error(error.message);
}

/** Fetch the audit trail for a single waiver, newest first. */
export async function fetchWaiverEvents(waiverId: string, companyId: string): Promise<LienWaiverEvent[]> {
  const { data, error } = await supabase
    .from('lien_waiver_events')
    .select('id, waiver_id, from_status, to_status, note, created_at')
    .eq('company_id', companyId)
    .eq('waiver_id', waiverId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LienWaiverEvent[];
}
