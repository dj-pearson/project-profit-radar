-- =====================================================
-- GPS TIME TRACKING & GEOFENCING
-- =====================================================
-- Purpose: Location-based time tracking for field workers
-- Features:
--   - GPS location capture
--   - Geofencing for job sites
--   - Auto clock-in/out
--   - Location history
--   - Travel time tracking
--   - Mileage calculation
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS travel_logs CASCADE;
DROP TABLE IF EXISTS location_history CASCADE;
DROP TABLE IF EXISTS geofences CASCADE;
DROP TABLE IF EXISTS gps_time_entries CASCADE;

-- =====================================================
-- 1. GPS TIME ENTRIES TABLE
-- =====================================================

CREATE TABLE gps_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  geofence_id UUID, -- Will reference geofences table

  -- Clock in location
  clock_in_lat DECIMAL(10, 8), -- Latitude at clock-in
  clock_in_lng DECIMAL(11, 8), -- Longitude at clock-in
  clock_in_accuracy DECIMAL(10, 2), -- GPS accuracy in meters
  clock_in_address TEXT, -- Reverse-geocoded address
  clock_in_timestamp TIMESTAMPTZ NOT NULL,

  -- Clock out location
  clock_out_lat DECIMAL(10, 8),
  clock_out_lng DECIMAL(11, 8),
  clock_out_accuracy DECIMAL(10, 2),
  clock_out_address TEXT,
  clock_out_timestamp TIMESTAMPTZ,

  -- Geofence validation
  is_within_geofence BOOLEAN DEFAULT FALSE,
  geofence_distance_meters DECIMAL(10, 2), -- Distance from geofence center
  geofence_breach_alert BOOLEAN DEFAULT FALSE, -- Alert if outside geofence

  -- Device info
  device_type TEXT, -- ios, android, web
  device_id TEXT,
  gps_provider TEXT, -- native, browser, manual

  -- Location tracking during shift
  location_tracking_enabled BOOLEAN DEFAULT FALSE,
  location_update_interval_minutes INTEGER DEFAULT 15,
  total_locations_captured INTEGER DEFAULT 0,

  -- Calculated fields
  total_distance_meters DECIMAL(10, 2), -- Distance moved during shift
  is_stationary BOOLEAN DEFAULT TRUE, -- Did worker stay in one location?

  -- Verification
  is_manually_adjusted BOOLEAN DEFAULT FALSE,
  adjusted_by UUID REFERENCES auth.users(id),
  adjustment_reason TEXT,
  adjustment_timestamp TIMESTAMPTZ,

  -- Flags
  requires_review BOOLEAN DEFAULT FALSE,
  review_reason TEXT, -- outside_geofence, unusual_distance, GPS_unreliable

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gps_time_entries_time_entry ON gps_time_entries(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_gps_time_entries_user ON gps_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_gps_time_entries_project ON gps_time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_gps_time_entries_geofence ON gps_time_entries(geofence_id);
CREATE INDEX IF NOT EXISTS idx_gps_time_entries_clock_in ON gps_time_entries(clock_in_timestamp);
CREATE INDEX IF NOT EXISTS idx_gps_time_entries_requires_review ON gps_time_entries(requires_review) WHERE requires_review = TRUE;

-- =====================================================
-- 2. GEOFENCES TABLE
-- =====================================================

CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID, -- Company-level geofences

  -- Geofence details
  name TEXT NOT NULL,
  description TEXT,

  -- Location
  center_lat DECIMAL(10, 8) NOT NULL,
  center_lng DECIMAL(11, 8) NOT NULL,
  radius_meters DECIMAL(10, 2) NOT NULL, -- Radius of geofence

  -- Alternative: Polygon geofence (for complex shapes)
  polygon_coordinates JSONB, -- Array of [lat, lng] pairs for polygon
  geofence_type TEXT DEFAULT 'circle', -- circle, polygon

  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',

  -- Rules
  auto_clock_in BOOLEAN DEFAULT FALSE, -- Automatically clock in when entering
  auto_clock_out BOOLEAN DEFAULT FALSE, -- Automatically clock out when exiting
  alert_on_entry BOOLEAN DEFAULT FALSE,
  alert_on_exit BOOLEAN DEFAULT FALSE,
  alert_on_breach BOOLEAN DEFAULT TRUE, -- Alert if worker is outside geofence

  -- Restrictions
  allowed_clock_in_times JSONB DEFAULT '[]'::jsonb, -- Array of allowed time windows
  -- Example: [{"start": "07:00", "end": "18:00", "days": ["mon", "tue", "wed"]}]

  allowed_users UUID[], -- Array of user IDs who can use this geofence
  allowed_roles TEXT[], -- Array of roles that can use this geofence

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Statistics
  total_clock_ins INTEGER DEFAULT 0,
  total_clock_outs INTEGER DEFAULT 0,
  total_breaches INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_geofences_project ON geofences(project_id);
CREATE INDEX IF NOT EXISTS idx_geofences_company ON geofences(company_id);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_geofences_location ON geofences(center_lat, center_lng);

-- =====================================================
-- 3. LOCATION HISTORY TABLE
-- =====================================================

CREATE TABLE location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  gps_time_entry_id UUID REFERENCES gps_time_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Location
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2), -- GPS accuracy in meters
  altitude DECIMAL(10, 2), -- Altitude in meters (optional)
  heading DECIMAL(5, 2), -- Direction of travel (0-360 degrees)
  speed DECIMAL(10, 2), -- Speed in km/h

  -- Address (reverse geocoded)
  address TEXT,
  city TEXT,
  state TEXT,

  -- Context
  activity_type TEXT, -- stationary, walking, in_vehicle, on_bicycle, etc.
  battery_level INTEGER, -- Device battery level (0-100)
  is_background_capture BOOLEAN DEFAULT FALSE, -- Captured while app in background

  -- Geofence check
  geofence_id UUID REFERENCES geofences(id),
  is_within_geofence BOOLEAN,
  distance_to_geofence DECIMAL(10, 2),

  -- Device
  device_type TEXT,
  gps_provider TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_location_history_gps_entry ON location_history(gps_time_entry_id);
CREATE INDEX IF NOT EXISTS idx_location_history_user ON location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_history_project ON location_history(project_id);
CREATE INDEX IF NOT EXISTS idx_location_history_captured ON location_history(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_history_geofence ON location_history(geofence_id);

-- =====================================================
-- 4. TRAVEL LOGS TABLE
-- =====================================================

CREATE TABLE travel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  to_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Start location
  start_lat DECIMAL(10, 8) NOT NULL,
  start_lng DECIMAL(11, 8) NOT NULL,
  start_address TEXT,
  start_timestamp TIMESTAMPTZ NOT NULL,

  -- End location
  end_lat DECIMAL(10, 8),
  end_lng DECIMAL(11, 8),
  end_address TEXT,
  end_timestamp TIMESTAMPTZ,

  -- Travel details
  distance_meters DECIMAL(10, 2), -- Calculated distance
  duration_minutes INTEGER, -- Travel time in minutes
  travel_method TEXT DEFAULT 'vehicle', -- vehicle, walking, bicycle, public_transport

  -- Route
  route_polyline TEXT, -- Encoded polyline for route visualization
  waypoints JSONB DEFAULT '[]'::jsonb, -- Array of intermediate coordinates

  -- Status
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, cancelled
  is_billable BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  -- Mileage
  mileage_rate_per_km DECIMAL(10, 2), -- Rate for reimbursement
  total_reimbursement DECIMAL(10, 2), -- Calculated reimbursement

  -- Notes
  purpose TEXT,
  notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_travel_logs_user ON travel_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_logs_from_project ON travel_logs(from_project_id);
CREATE INDEX IF NOT EXISTS idx_travel_logs_to_project ON travel_logs(to_project_id);
CREATE INDEX IF NOT EXISTS idx_travel_logs_start ON travel_logs(start_timestamp);
CREATE INDEX IF NOT EXISTS idx_travel_logs_status ON travel_logs(status);
CREATE INDEX IF NOT EXISTS idx_travel_logs_billable ON travel_logs(is_billable) WHERE is_billable = TRUE;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE gps_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own GPS time entries
CREATE POLICY "Users can view own GPS time entries"
  ON gps_time_entries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create GPS time entries
CREATE POLICY "Users can create GPS time entries"
  ON gps_time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all GPS entries
CREATE POLICY "Admins can view all GPS entries"
  ON gps_time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin', 'project_manager')
    )
  );

-- Geofences: Project-based access
CREATE POLICY "Users can view geofences"
  ON geofences FOR SELECT
  USING (
    project_id IS NULL OR
    EXISTS (
      SELECT 1 FROM gps_time_entries
      WHERE gps_time_entries.project_id = geofences.project_id
      AND gps_time_entries.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin', 'project_manager')
    )
  );

CREATE POLICY "Admins can manage geofences"
  ON geofences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin', 'project_manager')
    )
  );

-- Location history: Users can view their own
CREATE POLICY "Users can view own location history"
  ON location_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create location history"
  ON location_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Travel logs: Users can manage their own
CREATE POLICY "Users can view own travel logs"
  ON travel_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create travel logs"
  ON travel_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own travel logs"
  ON travel_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Update geofence statistics on clock in/out
CREATE OR REPLACE FUNCTION update_geofence_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.geofence_id IS NOT NULL THEN
    UPDATE geofences
    SET
      total_clock_ins = total_clock_ins + CASE WHEN NEW.clock_in_timestamp IS NOT NULL AND OLD.clock_in_timestamp IS NULL THEN 1 ELSE 0 END,
      total_clock_outs = total_clock_outs + CASE WHEN NEW.clock_out_timestamp IS NOT NULL AND OLD.clock_out_timestamp IS NULL THEN 1 ELSE 0 END,
      total_breaches = total_breaches + CASE WHEN NEW.geofence_breach_alert = TRUE AND OLD.geofence_breach_alert = FALSE THEN 1 ELSE 0 END
    WHERE id = NEW.geofence_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER geofence_stats_trigger
  AFTER INSERT OR UPDATE ON gps_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_geofence_stats();

-- Calculate travel log metrics
CREATE OR REPLACE FUNCTION calculate_travel_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_timestamp IS NOT NULL AND NEW.start_timestamp IS NOT NULL THEN
    -- Calculate duration
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_timestamp - NEW.start_timestamp)) / 60;

    -- Calculate distance (Haversine formula approximation)
    IF NEW.end_lat IS NOT NULL AND NEW.end_lng IS NOT NULL THEN
      NEW.distance_meters := (
        6371000 * acos(
          cos(radians(NEW.start_lat)) * cos(radians(NEW.end_lat)) *
          cos(radians(NEW.end_lng) - radians(NEW.start_lng)) +
          sin(radians(NEW.start_lat)) * sin(radians(NEW.end_lat))
        )
      );

      -- Calculate reimbursement
      IF NEW.mileage_rate_per_km IS NOT NULL AND NEW.is_billable THEN
        NEW.total_reimbursement := (NEW.distance_meters / 1000.0) * NEW.mileage_rate_per_km;
      END IF;
    END IF;

    -- Update status
    IF NEW.status = 'in_progress' THEN
      NEW.status := 'completed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER travel_log_metrics_trigger
  BEFORE INSERT OR UPDATE ON travel_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_travel_metrics();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Check if point is within geofence
CREATE OR REPLACE FUNCTION is_within_geofence(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_geofence_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_geofence geofences;
  v_distance DECIMAL;
BEGIN
  SELECT * INTO v_geofence
  FROM geofences
  WHERE id = p_geofence_id
  AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Calculate distance using Haversine formula
  v_distance := (
    6371000 * acos(
      cos(radians(v_geofence.center_lat)) * cos(radians(p_lat)) *
      cos(radians(p_lng) - radians(v_geofence.center_lng)) +
      sin(radians(v_geofence.center_lat)) * sin(radians(p_lat))
    )
  );

  RETURN v_distance <= v_geofence.radius_meters;
END;
$$ LANGUAGE plpgsql;

-- Get distance between two points (in meters)
CREATE OR REPLACE FUNCTION get_distance_meters(
  p_lat1 DECIMAL,
  p_lng1 DECIMAL,
  p_lat2 DECIMAL,
  p_lng2 DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    6371000 * acos(
      cos(radians(p_lat1)) * cos(radians(p_lat2)) *
      cos(radians(p_lng2) - radians(p_lng1)) +
      sin(radians(p_lat1)) * sin(radians(p_lat2))
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Get active geofence for project
CREATE OR REPLACE FUNCTION get_project_geofence(p_project_id UUID)
RETURNS UUID AS $$
DECLARE
  v_geofence_id UUID;
BEGIN
  SELECT id INTO v_geofence_id
  FROM geofences
  WHERE project_id = p_project_id
  AND is_active = TRUE
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_geofence_id;
END;
$$ LANGUAGE plpgsql;

-- Clock in with GPS
CREATE OR REPLACE FUNCTION clock_in_with_gps(
  p_user_id UUID,
  p_project_id UUID,
  p_time_entry_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_accuracy DECIMAL,
  p_device_type TEXT
)
RETURNS UUID AS $$
DECLARE
  v_gps_entry_id UUID;
  v_geofence_id UUID;
  v_is_within_geofence BOOLEAN;
  v_distance DECIMAL;
BEGIN
  -- Get active geofence for project
  v_geofence_id := get_project_geofence(p_project_id);

  -- Check if within geofence
  IF v_geofence_id IS NOT NULL THEN
    v_is_within_geofence := is_within_geofence(p_latitude, p_longitude, v_geofence_id);

    -- Calculate distance to geofence
    SELECT
      get_distance_meters(
        p_latitude,
        p_longitude,
        center_lat,
        center_lng
      ) INTO v_distance
    FROM geofences
    WHERE id = v_geofence_id;
  END IF;

  -- Create GPS time entry
  INSERT INTO gps_time_entries (
    time_entry_id,
    user_id,
    project_id,
    geofence_id,
    clock_in_lat,
    clock_in_lng,
    clock_in_accuracy,
    clock_in_timestamp,
    is_within_geofence,
    geofence_distance_meters,
    geofence_breach_alert,
    device_type,
    requires_review
  ) VALUES (
    p_time_entry_id,
    p_user_id,
    p_project_id,
    v_geofence_id,
    p_latitude,
    p_longitude,
    p_accuracy,
    NOW(),
    COALESCE(v_is_within_geofence, FALSE),
    v_distance,
    CASE WHEN v_geofence_id IS NOT NULL AND NOT COALESCE(v_is_within_geofence, FALSE) THEN TRUE ELSE FALSE END,
    p_device_type,
    CASE WHEN v_geofence_id IS NOT NULL AND NOT COALESCE(v_is_within_geofence, FALSE) THEN TRUE ELSE FALSE END
  )
  RETURNING id INTO v_gps_entry_id;

  RETURN v_gps_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get location summary for user
CREATE OR REPLACE FUNCTION get_user_location_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_entries INTEGER,
  entries_within_geofence INTEGER,
  entries_outside_geofence INTEGER,
  total_distance_meters DECIMAL,
  average_accuracy DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_entries,
    COUNT(*) FILTER (WHERE is_within_geofence = TRUE)::INTEGER as entries_within_geofence,
    COUNT(*) FILTER (WHERE is_within_geofence = FALSE)::INTEGER as entries_outside_geofence,
    SUM(total_distance_meters) as total_distance_meters,
    AVG(clock_in_accuracy) as average_accuracy
  FROM gps_time_entries
  WHERE user_id = p_user_id
  AND clock_in_timestamp::DATE BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE gps_time_entries IS
  'GPS-enabled time entries with geofence validation';

COMMENT ON TABLE geofences IS
  'Virtual boundaries for job sites with auto clock-in/out';

COMMENT ON TABLE location_history IS
  'Continuous location tracking during work shifts';

COMMENT ON TABLE travel_logs IS
  'Travel time and mileage tracking between job sites';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000013_gps_time_tracking.sql completed successfully';
  RAISE NOTICE 'Created tables: gps_time_entries, geofences, location_history, travel_logs';
  RAISE NOTICE 'Created indexes: 20+ indexes for performance';
  RAISE NOTICE 'Created policies: 10 RLS policies';
  RAISE NOTICE 'Created functions: is_within_geofence, get_distance_meters, get_project_geofence, clock_in_with_gps, get_user_location_summary';
  RAISE NOTICE 'Created triggers: Geofence stats, travel metrics calculation';
END $$;
