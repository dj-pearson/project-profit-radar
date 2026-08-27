/**
 * Audit-trail writer for edge functions (US-244).
 *
 * CLAUDE.md Security rule 4 says log critical actions to the audit trail. Only
 * a handful of functions did, because audit_logs has three competing CREATE
 * TABLE definitions in the migration history and no way to tell from the repo
 * which one production actually has:
 *
 *   20250202000012  tenant_id,  event_type NOT NULL, action NOT NULL, resource_type NOT NULL
 *   20250703164308  company_id, action_type NOT NULL, resource_type NOT NULL  (no event_type, no action)
 *   20250202000020  a bare table plus defensive ADD COLUMN for both company_id and tenant_id
 *
 * No single payload is valid under both of the first two: one requires
 * event_type, the other does not have that column at all. That is why US-244
 * stalled — an insert with the wrong shape throws on every mutation it is meant
 * to be recording, which is worse than not recording it.
 *
 * So this writer discovers the shape instead of assuming it. It tries a small
 * ordered list of candidate payloads, remembers the first that works for the
 * lifetime of the isolate, and NEVER THROWS: a write that cannot be recorded is
 * reported with console.error and the caller carries on. Audit logging must not
 * be able to break the operation it is auditing.
 *
 * Call it with the service-role client. Audit rows should not be writable by
 * the actor being audited, and RLS on audit_logs is scoped for client reads.
 *
 *   await writeAuditLog(serviceClient, {
 *     actorUserId: user.id,
 *     companyId: profile.company_id,
 *     action: 'refund.approved',
 *     entityType: 'refund',
 *     entityId: refund.id,
 *     after: { amount, status: 'approved' },
 *     riskLevel: 'high',
 *   });
 */

export interface AuditEntry {
  /** auth.users id of whoever performed the action. */
  actorUserId?: string | null;
  companyId?: string | null;
  /** Dotted verb, e.g. 'refund.approved', 'mfa.disabled', 'api_key.created'. */
  action: string;
  /** The kind of thing acted on, e.g. 'refund', 'user', 'api_key'. */
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  description?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

type Shape = 'action_type' | 'event_type' | 'minimal';

/** Remembered for the isolate once one works, so the cost is one bad insert per cold start. */
let knownShape: Shape | null = null;

function buildRow(shape: Shape, e: AuditEntry): Record<string, unknown> {
  const base: Record<string, unknown> = {
    user_id: e.actorUserId ?? null,
    resource_type: e.entityType,
    resource_id: e.entityId ?? null,
  };
  if (e.before !== undefined) base.old_values = e.before;
  if (e.after !== undefined) base.new_values = e.after;

  if (shape === 'action_type') {
    // 20250703164308: company_id + action_type, with description/risk_level.
    return {
      ...base,
      company_id: e.companyId ?? null,
      action_type: e.action,
      description: e.description ?? e.action,
      risk_level: e.riskLevel ?? 'medium',
    };
  }
  if (shape === 'event_type') {
    // 20250202000012: tenant_id + event_type + action, both NOT NULL.
    return {
      ...base,
      tenant_id: e.companyId ?? null,
      event_type: e.action.split('.')[1] ?? 'update',
      action: e.action,
    };
  }
  // Last resort: the columns every definition agrees on.
  return {
    user_id: e.actorUserId ?? null,
    resource_type: e.entityType,
    resource_id: e.entityId ?? null,
  };
}

const ORDER: Shape[] = ['action_type', 'event_type', 'minimal'];

/**
 * Append an audit row. Best-effort by design — never throws, never rejects.
 */
export async function writeAuditLog(
  // deno-lint-ignore no-explicit-any
  client: any,
  entry: AuditEntry,
): Promise<void> {
  const candidates = knownShape ? [knownShape] : ORDER;

  for (const shape of candidates) {
    try {
      const { error } = await client.from('audit_logs').insert(buildRow(shape, entry));
      if (!error) {
        knownShape = shape;
        return;
      }
      // 42703 undefined_column / PGRST204 unknown column — try the next shape.
      // Anything else is a real failure for this shape too, so keep going.
      if (knownShape === shape) knownShape = null;
    } catch (err) {
      console.error('[audit-log] insert threw', { action: entry.action, err: String(err) });
    }
  }

  console.error('[audit-log] could not record action; no candidate shape matched audit_logs', {
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
  });
}
