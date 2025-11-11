-- Migration: Crew GPS Check-in and Geofencing Integration
-- Date: 2025-11-10
-- Purpose: Link crew assignments to geofences and add GPS verification

-- =====================================================
-- 1. Add GPS Check-in Fields to crew_assignments
-- =====================================================

ALTER TABLE crew_assignments
ADD COLUMN IF NOT EXISTS geofence_id UUID REFERENCES geofences(id),
ADD COLUMN IF NOT EXISTS gps_checkin_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gps_checkin_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_checkin_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_checkin_accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_checkin_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_onsite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gps_checkout_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gps_checkout_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_checkout_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS distance_from_site DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS arrival_notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS checkin_notes TEXT;

-- Add index for querying onsite crews
CREATE INDEX IF NOT EXISTS idx_crew_assignments_onsite
ON crew_assignments(project_id, is_onsite)
WHERE is_onsite = true;

-- Add index for geofence lookups
CREATE INDEX IF NOT EXISTS idx_crew_assignments_geofence
ON crew_assignments(geofence_id);

-- Add index for check-in timestamp queries
CREATE INDEX IF NOT EXISTS idx_crew_assignments_gps_checkin
ON crew_assignments(gps_checkin_timestamp DESC);

-- =====================================================
-- 2. Add GPS Verification Fields to time_entries
-- =====================================================

ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS geofence_id UUID REFERENCES geofences(id),
ADD COLUMN IF NOT EXISTS is_geofence_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS geofence_distance_meters DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geofence_breach_detected BOOLEAN DEFAULT false;

-- Add index for geofence-verified entries
CREATE INDEX IF NOT EXISTS idx_time_entries_geofence
ON time_entries(geofence_id)
WHERE geofence_id IS NOT NULL;

-- =====================================================
-- 3. Create Crew Presence View for Real-time Dashboard
-- =====================================================

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
ORDER BY ca.is_onsite DESC, ca.gps_checkin_timestamp DESC;

-- Grant access to authenticated users
GRANT SELECT ON crew_presence_dashboard TO authenticated;

-- =====================================================
-- 4. Create Function to Update Crew Onsite Status
-- =====================================================

CREATE OR REPLACE FUNCTION update_crew_onsite_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When GPS check-in is recorded and verified
  IF NEW.gps_checkin_verified = true AND OLD.is_onsite = false THEN
    NEW.is_onsite = true;
    NEW.status = 'in_progress';
  END IF;

  -- When GPS check-out is recorded
  IF NEW.gps_checkout_timestamp IS NOT NULL AND OLD.gps_checkout_timestamp IS NULL THEN
    NEW.is_onsite = false;
    NEW.status = 'completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status updates
DROP TRIGGER IF EXISTS trigger_update_crew_onsite_status ON crew_assignments;
CREATE TRIGGER trigger_update_crew_onsite_status
  BEFORE UPDATE ON crew_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_onsite_status();

-- =====================================================
-- 5. Function to Verify GPS Check-in Against Geofence
-- =====================================================

CREATE OR REPLACE FUNCTION verify_crew_gps_checkin(
  p_assignment_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_accuracy DOUBLE PRECISION
)
RETURNS JSON AS $$
DECLARE
  v_assignment crew_assignments%ROWTYPE;
  v_project projects%ROWTYPE;
  v_geofence geofences%ROWTYPE;
  v_distance DOUBLE PRECISION;
  v_is_inside BOOLEAN;
  v_result JSON;
BEGIN
  -- Get crew assignment
  SELECT * INTO v_assignment
  FROM crew_assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Assignment not found'
    );
  END IF;

  -- Get project details
  SELECT * INTO v_project
  FROM projects
  WHERE id = v_assignment.project_id;

  -- Try to get associated geofence, or use project coordinates
  IF v_assignment.geofence_id IS NOT NULL THEN
    SELECT * INTO v_geofence
    FROM geofences
    WHERE id = v_assignment.geofence_id;
  END IF;

  -- Calculate distance using Haversine formula
  IF v_geofence.id IS NOT NULL THEN
    -- Use geofence center
    v_distance := 6371000 * acos(
      cos(radians(p_latitude)) *
      cos(radians(v_geofence.center_latitude)) *
      cos(radians(v_geofence.center_longitude) - radians(p_longitude)) +
      sin(radians(p_latitude)) *
      sin(radians(v_geofence.center_latitude))
    );
    v_is_inside := v_distance <= v_geofence.radius_meters;
  ELSIF v_project.geofence_latitude IS NOT NULL THEN
    -- Use project coordinates
    v_distance := 6371000 * acos(
      cos(radians(p_latitude)) *
      cos(radians(v_project.geofence_latitude)) *
      cos(radians(v_project.geofence_longitude) - radians(p_longitude)) +
      sin(radians(p_latitude)) *
      sin(radians(v_project.geofence_latitude))
    );
    v_is_inside := v_distance <= COALESCE(v_project.geofence_radius_meters, 100);
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'No geofence configured for this project'
    );
  END IF;

  -- Update crew assignment with GPS check-in
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

  -- Return result
  RETURN json_build_object(
    'success', true,
    'verified', v_is_inside,
    'distance_meters', ROUND(v_distance::numeric, 2),
    'allowed_radius_meters', COALESCE(v_geofence.radius_meters, v_project.geofence_radius_meters, 100),
    'message', CASE
      WHEN v_is_inside THEN 'GPS check-in verified - you are on site'
      ELSE format('You are %.0fm from the site. Please move closer to check in.', v_distance)
    END
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. Function to Get Crew Assignments Needing Check-in
-- =====================================================

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
  g.radius_meters as geofence_radius_meters
FROM crew_assignments ca
JOIN user_profiles up ON ca.crew_member_id = up.id
JOIN projects p ON ca.project_id = p.id
LEFT JOIN geofences g ON ca.geofence_id = g.id
WHERE ca.assigned_date = CURRENT_DATE
  AND ca.status IN ('scheduled', 'dispatched')
  AND ca.gps_checkin_verified IS NOT true
ORDER BY ca.assigned_date, CONCAT(up.first_name, ' ', up.last_name);

-- Grant access
GRANT SELECT ON crew_assignments_pending_checkin TO authenticated;

-- =====================================================
-- 7. RLS Policies for New Fields
-- =====================================================

-- Users can view crew presence for their company's projects
DROP POLICY IF EXISTS "Users can view crew presence for company projects" ON crew_assignments;
CREATE POLICY "Users can view crew presence for company projects"
  ON crew_assignments
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE company_id = (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Users can update their own GPS check-in
DROP POLICY IF EXISTS "Users can update their own GPS check-in" ON crew_assignments;
CREATE POLICY "Users can update their own GPS check-in"
  ON crew_assignments
  FOR UPDATE
  USING (crew_member_id = auth.uid())
  WITH CHECK (crew_member_id = auth.uid());

-- =====================================================
-- 8. Comments for Documentation
-- =====================================================

COMMENT ON COLUMN crew_assignments.geofence_id IS 'Link to geofences table for advanced geofencing';
COMMENT ON COLUMN crew_assignments.gps_checkin_verified IS 'Whether GPS check-in was within geofence radius';
COMMENT ON COLUMN crew_assignments.is_onsite IS 'Current onsite status - true if crew member is currently at the site';
COMMENT ON COLUMN crew_assignments.distance_from_site IS 'Distance in meters from geofence center at check-in time';

COMMENT ON VIEW crew_presence_dashboard IS 'Real-time dashboard showing current crew presence and location status';
COMMENT ON VIEW crew_assignments_pending_checkin IS 'Crew assignments scheduled for today that need GPS check-in';

COMMENT ON FUNCTION verify_crew_gps_checkin IS 'Verifies crew member GPS location against project geofence and records check-in';
