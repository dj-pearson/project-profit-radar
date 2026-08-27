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
