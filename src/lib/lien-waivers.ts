/**
 * US-227: Lien waiver domain logic (pure, framework-free, unit-tested).
 *
 * Models the four standard US construction lien-waiver types (conditional vs
 * unconditional × progress vs final), the request→received lifecycle, and the
 * payment-hold rule that releases a subcontractor payment only once the
 * required waiver has been received. Persistence lives in
 * services/lienWaiverService; UI lives in pages/LienWaivers.
 */

/** Conditional = effective once payment clears; Unconditional = effective on signing. */
export type WaiverConditionality = 'conditional' | 'unconditional';
/** Progress = interim/partial payment; Final = final payment / project close-out. */
export type WaiverStage = 'progress' | 'final';

/** The four canonical lien-waiver types. */
export type WaiverType =
  | 'conditional-progress'
  | 'unconditional-progress'
  | 'conditional-final'
  | 'unconditional-final';

/** Lifecycle: a waiver is requested, sent for signature, signed, then received. */
export type WaiverStatus = 'draft' | 'requested' | 'sent' | 'signed' | 'received' | 'rejected';

export interface WaiverTypeMeta {
  id: WaiverType;
  label: string;
  conditionality: WaiverConditionality;
  stage: WaiverStage;
  description: string;
}

export const WAIVER_TYPES: WaiverTypeMeta[] = [
  {
    id: 'conditional-progress',
    label: 'Conditional — Progress Payment',
    conditionality: 'conditional',
    stage: 'progress',
    description: 'Waives lien rights for a progress payment, effective only once that payment clears.',
  },
  {
    id: 'unconditional-progress',
    label: 'Unconditional — Progress Payment',
    conditionality: 'unconditional',
    stage: 'progress',
    description: 'Waives lien rights for a progress payment, effective immediately on signing.',
  },
  {
    id: 'conditional-final',
    label: 'Conditional — Final Payment',
    conditionality: 'conditional',
    stage: 'final',
    description: 'Waives all lien rights on final payment, effective only once final payment clears.',
  },
  {
    id: 'unconditional-final',
    label: 'Unconditional — Final Payment',
    conditionality: 'unconditional',
    stage: 'final',
    description: 'Waives all lien rights on final payment, effective immediately on signing.',
  },
];

export interface WaiverStatusMeta {
  id: WaiverStatus;
  label: string;
  /** Badge tone hint for the UI (maps to shadcn Badge variants). */
  tone: 'secondary' | 'outline' | 'default' | 'destructive';
}

export const WAIVER_STATUSES: WaiverStatusMeta[] = [
  { id: 'draft', label: 'Draft', tone: 'outline' },
  { id: 'requested', label: 'Requested', tone: 'secondary' },
  { id: 'sent', label: 'Sent for Signature', tone: 'secondary' },
  { id: 'signed', label: 'Signed', tone: 'default' },
  { id: 'received', label: 'Received', tone: 'default' },
  { id: 'rejected', label: 'Rejected', tone: 'destructive' },
];

/** Allowed forward/again transitions for the waiver lifecycle. */
const ALLOWED_TRANSITIONS: Record<WaiverStatus, WaiverStatus[]> = {
  draft: ['requested', 'rejected'],
  requested: ['sent', 'rejected'],
  sent: ['signed', 'rejected'],
  signed: ['received', 'rejected'],
  received: [],
  rejected: ['requested'],
};

/** Look up the metadata for a waiver type id, or undefined if unknown. */
export function waiverTypeMeta(type: string): WaiverTypeMeta | undefined {
  return WAIVER_TYPES.find((t) => t.id === type);
}

/** Human-readable label for a waiver type, falling back to the raw id. */
export function waiverTypeLabel(type: string): string {
  return waiverTypeMeta(type)?.label ?? type;
}

/** Metadata (label + badge tone) for a status, with a safe fallback for unknown values. */
export function waiverStatusMeta(status: string): WaiverStatusMeta {
  return WAIVER_STATUSES.find((s) => s.id === status) ?? { id: status as WaiverStatus, label: status, tone: 'outline' };
}

/** Whether `to` is a permitted next status from `from`. */
export function canTransition(from: WaiverStatus, to: WaiverStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Payment-hold rule. A subcontractor payment is released only when the waiver
 * tied to it has been received. Anything short of 'received' holds the payment;
 * a rejected waiver also holds it (and signals follow-up).
 */
export function isWaiverSatisfied(status: string): boolean {
  return status === 'received';
}

export interface PaymentHold {
  /** True when the payment may be released (waiver received). */
  released: boolean;
  /** Short human-readable reason for the current hold/release state. */
  reason: string;
}

/**
 * Resolve whether a payment can be released given the waivers attached to it.
 * Release requires at least one waiver and every waiver received. An empty
 * list holds the payment (no waiver on file yet).
 */
export function resolvePaymentHold(waiverStatuses: string[]): PaymentHold {
  if (waiverStatuses.length === 0) {
    return { released: false, reason: 'No lien waiver on file — payment held.' };
  }
  const outstanding = waiverStatuses.filter((s) => !isWaiverSatisfied(s));
  if (outstanding.length === 0) {
    return { released: true, reason: 'All required waivers received — payment may be released.' };
  }
  return {
    released: false,
    reason: `${outstanding.length} waiver${outstanding.length === 1 ? '' : 's'} outstanding — payment held.`,
  };
}

export interface WaiverRequestForm {
  contractorId: string;
  projectId: string;
  type: WaiverType | '';
  amount: string | number;
  throughDate: string;
}

/** Validate a new waiver request; returns a list of human-readable errors. */
export function validateWaiverRequest(form: WaiverRequestForm): string[] {
  const errors: string[] = [];
  if (!form.contractorId) errors.push('Select a subcontractor/supplier.');
  if (!form.projectId) errors.push('Select a project.');
  if (!form.type) errors.push('Choose a waiver type.');
  const amt = typeof form.amount === 'string' ? Number(form.amount) : form.amount;
  if (!Number.isFinite(amt) || amt <= 0) errors.push('Enter a payment amount greater than zero.');
  if (!form.throughDate) errors.push('Enter the "through" date the waiver covers.');
  return errors;
}
