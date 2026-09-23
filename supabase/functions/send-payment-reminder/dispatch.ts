/**
 * Request routing for send-payment-reminder, kept free of Deno and Supabase
 * imports so the tenancy rules can be tested (US-341).
 *
 * Before this, the handler treated the Authorization header as optional and
 * used body.company_id whenever one was sent, on a service-role client. The
 * publishable anon key is a valid project JWT, so verify_jwt let anyone
 * through, getUser() failed quietly, and the caller chose which company's
 * invoices to read and whose customers to email.
 *
 * Now: process_scheduled is internal-only (cron / service role), and every
 * other action requires a signed-in user and runs against that user's company.
 * A body company_id that disagrees is a 403, not a silent override.
 */
import { resolveCompanyScope } from '../_shared/caller-company.ts';

export type ReminderAction =
  | 'send' | 'schedule' | 'process_scheduled' | 'get_settings' | 'update_settings' | 'preview';

export interface ReminderBody {
  action?: string;
  company_id?: unknown;
  [key: string]: unknown;
}

export interface Caller {
  userId: string;
  companyId: string | null;
}

export interface ReminderDeps {
  /** null when the caller is internal, otherwise the rejection to return. */
  requireInternalCaller: () => Response | null;
  /** null when there is no verified user behind the request. */
  authenticate: () => Promise<Caller | null>;
  processScheduled: () => Promise<Response>;
  forCompany: Record<Exclude<ReminderAction, 'process_scheduled'>, (companyId: string, body: ReminderBody) => Promise<Response>>;
  json: (payload: Record<string, unknown>, status: number) => Response;
}

const USER_ACTIONS = new Set(['send', 'schedule', 'get_settings', 'update_settings', 'preview']);

export async function dispatchReminder(body: ReminderBody, deps: ReminderDeps): Promise<Response> {
  const action = body.action;

  if (action === 'process_scheduled') {
    const denied = deps.requireInternalCaller();
    if (denied) return denied;
    return deps.processScheduled();
  }

  if (typeof action !== 'string' || !USER_ACTIONS.has(action)) {
    return deps.json({
      success: false,
      error: 'Invalid action. Use: send, schedule, process_scheduled, get_settings, update_settings, preview',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  const caller = await deps.authenticate();
  if (!caller) {
    return deps.json({ success: false, error: 'Unauthorized', timestamp: new Date().toISOString() }, 401);
  }

  const scope = resolveCompanyScope(caller.companyId, body.company_id);
  if (!scope.ok) {
    return deps.json({ success: false, error: scope.error, timestamp: new Date().toISOString() }, scope.status);
  }

  return deps.forCompany[action as Exclude<ReminderAction, 'process_scheduled'>](scope.companyId, body);
}
