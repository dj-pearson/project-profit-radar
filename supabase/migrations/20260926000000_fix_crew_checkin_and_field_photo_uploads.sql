-- Crew GPS check-in and field photo uploads, found while bringing both to the
-- native iOS app.
--
-- 1. verify_crew_gps_checkin() could not succeed. It read
--    geofences.center_latitude / center_longitude (the columns are center_lat /
--    center_lng) and projects.geofence_latitude / geofence_longitude (the
--    project pin is site_latitude / site_longitude). PL/pgSQL resolves record
--    fields at run time, so every call raised "record has no field" once it
--    reached the distance check. Same signature and same JSON shape; the body
--    reads the real columns.
--
--    It also never checked whose assignment it was writing. The function runs
--    as the caller, so RLS stopped the UPDATE on someone else's row, but it
--    still returned success: true. It now refuses an assignment that isn't the
--    caller's. No working caller loses anything: there were none.
--
--    acos() is clamped to [-1, 1]; rounding at a distance of ~0 m can push the
--    argument past 1 and raise "input is out of range" for someone standing
--    on the pin.
--
-- 2. crew_assignments_pending_checkin gains a trailing user_id column (the
--    crew member). useCrewGPSCheckin.ts filters the view on user_id, which it
--    never had, so the web check-in list errored. Appending a column is the
--    only change CREATE OR REPLACE VIEW allows, and it is additive.
--
-- 3. Field roles may upload photos to project-documents. The only INSERT
--    policy on the bucket (20250703014008) allows admin, project_manager,
--    office_staff and root_admin, so a field supervisor's daily-report photos
--    were rejected by storage and skipped by the web form without a word.
--    This is a second, additive policy: company projects only, and only the
--    photos/ and daily-reports/ folders under the project id, so it does not
--    widen who can put arbitrary documents in the bucket.

-- ---------------------------------------------------------------------------
-- 1. verify_crew_gps_checkin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_crew_gps_checkin(
  p_assignment_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_accuracy DOUBLE PRECISION
)
RETURNS JSON AS $$
DECLARE
  v_assignment crew_assignments%ROWTYPE;
  v_center_lat DOUBLE PRECISION;
  v_center_lng DOUBLE PRECISION;
  v_radius DOUBLE PRECISION;
  v_distance DOUBLE PRECISION;
  v_is_inside BOOLEAN;
BEGIN
  SELECT * INTO v_assignment
  FROM crew_assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Assignment not found');
  END IF;

  IF v_assignment.crew_member_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'This assignment belongs to someone else');
  END IF;

  -- The assignment's own geofence wins; otherwise the project's site pin.
  IF v_assignment.geofence_id IS NOT NULL THEN
    SELECT g.center_lat, g.center_lng, g.radius_meters
      INTO v_center_lat, v_center_lng, v_radius
    FROM geofences g
    WHERE g.id = v_assignment.geofence_id;
  END IF;

  IF v_center_lat IS NULL THEN
    SELECT p.site_latitude, p.site_longitude, COALESCE(p.geofence_radius_meters, 100)
      INTO v_center_lat, v_center_lng, v_radius
    FROM projects p
    WHERE p.id = v_assignment.project_id;
  END IF;

  IF v_center_lat IS NULL OR v_center_lng IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No geofence configured for this project');
  END IF;

  v_distance := 6371000 * acos(LEAST(1.0, GREATEST(-1.0,
    cos(radians(p_latitude)) *
    cos(radians(v_center_lat)) *
    cos(radians(v_center_lng) - radians(p_longitude)) +
    sin(radians(p_latitude)) *
    sin(radians(v_center_lat))
  )));
  v_is_inside := v_distance <= v_radius;

  UPDATE crew_assignments
  SET
    gps_checkin_timestamp = NOW(),
    gps_checkin_lat = p_latitude,
    gps_checkin_lng = p_longitude,
    gps_checkin_accuracy = p_accuracy,
    distance_from_site = v_distance,
    gps_checkin_verified = v_is_inside,
    is_onsite = v_is_inside,
    status = CASE WHEN v_is_inside THEN 'in_progress' ELSE status END
  WHERE id = p_assignment_id;

  RETURN json_build_object(
    'success', true,
    'verified', v_is_inside,
    'distance_meters', ROUND(v_distance::numeric, 2),
    'allowed_radius_meters', v_radius,
    'message', CASE
      WHEN v_is_inside THEN 'GPS check-in verified - you are on site'
      ELSE format('You are %sm from the site. Please move closer to check in.', ROUND(v_distance::numeric))
    END
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_crew_gps_checkin(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS
  'Records the caller''s GPS check-in on their own crew assignment and reports whether it is inside the assignment geofence or the project site radius. Returns { success, verified, distance_meters, allowed_radius_meters, message } or { success: false, error }.';

-- ---------------------------------------------------------------------------
-- 2. crew_assignments_pending_checkin: append user_id
-- ---------------------------------------------------------------------------
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
  AND ca.status IN ('scheduled', 'dispatched')
  AND ca.gps_checkin_verified IS NOT true
ORDER BY ca.assigned_date, CONCAT(up.first_name, ' ', up.last_name);

GRANT SELECT ON crew_assignments_pending_checkin TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Field roles upload photos to project-documents
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Field staff can upload project photos" ON storage.objects;
CREATE POLICY "Field staff can upload project photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents'
  AND (storage.foldername(name))[2] IN ('photos', 'daily-reports')
  AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.company_id = get_user_company(auth.uid())
  )
  AND get_user_role(auth.uid()) = ANY (ARRAY[
    'field_supervisor'::user_role,
    'foreman'::user_role,
    'superintendent'::user_role,
    'safety_officer'::user_role,
    'quality_inspector'::user_role,
    'technician'::user_role
  ])
);
