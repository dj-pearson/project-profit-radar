-- Scope the two crew views to the caller's company.
--
-- crew_presence_dashboard and crew_assignments_pending_checkin are plain
-- views, so they run with their owner's rights and RLS on crew_assignments,
-- user_profiles and projects never applies to them. Neither had a company
-- filter: any signed-in user could read every company's crew names, emails,
-- phone numbers and where they were checked in.
--
-- This adds the company filter inside each view instead of switching them to
-- security_invoker. Invoker mode would make the result depend on the
-- user_profiles SELECT policies for coworkers, which could quietly drop rows
-- a project manager is meant to see. Filtering on the project's company is
-- the same boundary crew_assignments' own SELECT policy draws.
--
-- Deliberate tightening of a read path (CLAUDE.md asks for these to be staged
-- across releases). It is done in one step because what it removes is
-- cross-tenant data; no client is meant to rely on reading another company's
-- crew. Same columns, same order, so CREATE OR REPLACE VIEW applies and no
-- client's query shape changes. root_admin keeps the cross-company view it has
-- elsewhere.

CREATE OR REPLACE VIEW crew_presence_dashboard AS
SELECT
  ca.id as assignment_id,
  ca.project_id,
  ca.assigned_date,
  ca.status,
  ca.is_onsite,
  ca.gps_checkin_timestamp,
  ca.gps_checkout_timestamp,
  ca.distance_from_site,
  ca.gps_checkin_verified,

  -- User info
  up.id as user_id,
  CONCAT(up.first_name, ' ', up.last_name) as crew_member_name,
  up.email as crew_member_email,
  up.phone as crew_member_phone,
  up.role as crew_member_role,

  -- Project info
  p.name as project_name,
  p.site_address as project_location,

  -- Geofence info
  g.name as geofence_name,
  g.geofence_type,
  g.center_lat as geofence_center_lat,
  g.center_lng as geofence_center_lng,
  g.radius_meters as geofence_radius,

  -- Time on site calculation
  CASE
    WHEN ca.is_onsite AND ca.gps_checkin_timestamp IS NOT NULL
    THEN EXTRACT(EPOCH FROM (NOW() - ca.gps_checkin_timestamp))/3600
    ELSE 0
  END as hours_onsite,

  -- Status indicators
  CASE
    WHEN ca.is_onsite THEN 'On Site'
    WHEN ca.status = 'dispatched' THEN 'En Route'
    WHEN ca.status = 'scheduled' THEN 'Scheduled'
    WHEN ca.status = 'completed' THEN 'Completed'
    ELSE 'Unknown'
  END as presence_status

FROM crew_assignments ca
JOIN user_profiles up ON ca.crew_member_id = up.id
JOIN projects p ON ca.project_id = p.id
LEFT JOIN geofences g ON ca.geofence_id = g.id
WHERE ca.assigned_date >= CURRENT_DATE - INTERVAL '7 days'
  AND (
    p.company_id = get_user_company(auth.uid())
    OR get_user_role(auth.uid()) = 'root_admin'::user_role
  )
ORDER BY ca.is_onsite DESC, ca.gps_checkin_timestamp DESC;

GRANT SELECT ON crew_presence_dashboard TO authenticated;

CREATE OR REPLACE VIEW crew_assignments_pending_checkin AS
SELECT
  ca.id,
  ca.crew_member_id,
  ca.project_id,
  ca.assigned_date,
  ca.status,
  CONCAT(up.first_name, ' ', up.last_name) as crew_member_name,
  p.name as project_name,
  p.site_address as project_location,
  g.center_lat as geofence_latitude,
  g.center_lng as geofence_longitude,
  g.radius_meters as geofence_radius_meters,
  ca.crew_member_id as user_id
FROM crew_assignments ca
JOIN user_profiles up ON ca.crew_member_id = up.id
JOIN projects p ON ca.project_id = p.id
LEFT JOIN geofences g ON ca.geofence_id = g.id
WHERE ca.assigned_date = CURRENT_DATE
  AND (
    p.company_id = get_user_company(auth.uid())
    OR get_user_role(auth.uid()) = 'root_admin'::user_role
  )
  AND ca.status IN ('scheduled', 'dispatched')
  AND ca.gps_checkin_verified IS NOT true
ORDER BY ca.assigned_date, CONCAT(up.first_name, ' ', up.last_name);

GRANT SELECT ON crew_assignments_pending_checkin TO authenticated;
