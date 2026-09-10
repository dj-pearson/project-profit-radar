/**
 * Column allowlists for endpoints that write a caller-supplied body (US-241).
 *
 * Spreading a request body into insert()/update() lets the caller set every
 * writable column on the table, including identity and provenance columns
 * (`id`, `created_by`, `created_at`) and the tenancy columns (`company_id`,
 * `site_id`, `tenant_id`). RLS catches some of that on user-JWT paths, but
 * nothing catches it on a service-role client.
 *
 * These lists are applied unconditionally, not staged behind
 * INPUT_VALIDATION_MODE: dropping a column a client should never have been
 * writing is not the kind of tightening that strands an older client.
 */

/** Columns a caller may set on `projects`. Tenancy and provenance are excluded
 *  on purpose — the handler derives those from the authenticated context. */
export const WRITABLE_PROJECT_COLUMNS = [
  'name', 'description', 'status', 'project_type',
  'client_name', 'client_email',
  'site_address', 'site_latitude', 'site_longitude', 'geofence_radius_meters',
  'start_date', 'end_date',
  'budget', 'total_budget', 'profit_margin',
  'estimated_hours', 'actual_hours', 'completion_percentage',
  'project_manager_id', 'opportunity_id', 'permit_numbers', 'created_from',
] as const;

/** Columns a caller may set when clocking in on `time_entries`.
 *
 *  The approval columns are deliberately absent. The clock-in handler used to
 *  spread the raw body, so a worker could post
 *  `{ approval_status: 'approved', approved_by: <someone> }` and self-approve
 *  the timesheet that drives payroll. RLS only checks company_id and user_id,
 *  so it never saw that. `total_hours` is excluded too — it is derived from
 *  start/end, not supplied. */
export const WRITABLE_TIME_ENTRY_COLUMNS = [
  'project_id', 'task_id', 'cost_code_id',
  'description', 'location', 'location_accuracy',
  'gps_latitude', 'gps_longitude',
  'geofence_id', 'is_geofence_verified',
  'geofence_breach_detected', 'geofence_distance_meters',
  'break_duration',
] as const;

/** Columns a caller may set on `seo_alert_rules` (root_admin-only endpoint). */
export const WRITABLE_ALERT_RULE_COLUMNS = [
  'rule_name', 'rule_type', 'threshold', 'severity', 'notification_channel', 'is_active',
] as const;

/** Columns a caller may set on `seo_monitoring_schedules` (root_admin-only endpoint). */
export const WRITABLE_SCHEDULE_COLUMNS = [
  'schedule_name', 'target_url', 'audit_type', 'frequency', 'is_active',
] as const;

/** Copy only the allowlisted keys out of a request body. */
export function pickAllowed(
  body: Record<string, unknown>,
  allowed: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) out[key] = body[key];
  }
  return out;
}

/**
 * The role a self-signup gets, and the only roles an invite may carry.
 *
 * Same class of hole as the column allowlists above, one level up: it is not a
 * column the caller should not be writing, it is a VALUE the caller should not
 * be choosing. signup-with-otp declared `role: z.string().optional()
 * .default('admin')` and passed it into a service-role insert on
 * user_profiles, so an unauthenticated POST of {"role":"root_admin"} created a
 * root admin. Every RLS policy in the schema resolves authority through
 * get_user_role(), which reads that column.
 *
 * Self-signup takes no role at all. The signer-up is the first account in a
 * new workspace, which is what 'admin' means here - and it matches what the
 * handle_new_user trigger already hardcodes for the same case.
 */
export const SELF_SIGNUP_ROLE = 'admin' as const;

/**
 * Roles an invite may assign. root_admin is platform-wide and deliberately
 * absent: it is not a workspace role and no invite should ever mint one.
 */
export const ASSIGNABLE_INVITE_ROLES = [
  'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting', 'client_portal',
] as const;

/** Fall back to the least-privileged role rather than trusting an unknown one. */
export function safeInviteRole(role: unknown): string {
  return typeof role === 'string' && (ASSIGNABLE_INVITE_ROLES as readonly string[]).includes(role)
    ? role
    : 'office_staff';
}
