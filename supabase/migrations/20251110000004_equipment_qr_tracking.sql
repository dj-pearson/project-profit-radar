-- Migration: Equipment QR Code Tracking System
-- Date: 2025-11-10
-- Purpose: Enable QR code scanning for equipment check-out/in with transaction logging

-- =====================================================
-- 1. Create Equipment QR Codes Table
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,

  -- QR Code Data
  qr_code_value TEXT UNIQUE NOT NULL,
  qr_code_format TEXT DEFAULT 'json' CHECK (qr_code_format IN ('json', 'url', 'simple')),
  qr_code_image TEXT, -- Base64 data URL or storage path
  barcode_value TEXT, -- Optional traditional barcode

  -- Metadata
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  printed_at TIMESTAMPTZ,
  last_scanned_at TIMESTAMPTZ,
  scan_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Label Info
  label_size TEXT, -- e.g., '2x2', '3x4' inches
  label_format TEXT, -- e.g., 'pdf', 'png'

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(equipment_id, is_active) WHERE is_active = true
);

GRANT SELECT, INSERT, UPDATE ON equipment_qr_codes TO authenticated;

CREATE INDEX IF NOT EXISTS idx_equipment_qr_codes_company
ON equipment_qr_codes(company_id);

CREATE INDEX IF NOT EXISTS idx_equipment_qr_codes_equipment
ON equipment_qr_codes(equipment_id);

CREATE INDEX IF NOT EXISTS idx_equipment_qr_codes_value
ON equipment_qr_codes(qr_code_value);

CREATE INDEX IF NOT EXISTS idx_equipment_qr_codes_active
ON equipment_qr_codes(is_active)
WHERE is_active = true;

-- =====================================================
-- 2. Create Equipment Scan Events Table
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment_scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  qr_code_id UUID REFERENCES equipment_qr_codes(id) ON DELETE SET NULL,

  -- Scan Details
  scan_type TEXT NOT NULL CHECK (scan_type IN ('check_out', 'check_in', 'inspection', 'location_update', 'maintenance', 'verification')),
  scanned_by UUID NOT NULL REFERENCES auth.users(id),
  scanned_at TIMESTAMPTZ DEFAULT now(),

  -- Location Data
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  location_description TEXT,
  project_id UUID REFERENCES projects(id),

  -- Transaction Data
  condition_rating TEXT CHECK (condition_rating IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),
  hours_reading DOUBLE PRECISION,
  fuel_level DOUBLE PRECISION, -- Percentage 0-100
  photo_urls TEXT[],
  notes TEXT,

  -- Check-out/in specific
  due_back_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  overdue_flag BOOLEAN DEFAULT false,

  -- Offline Support
  synced_from_offline BOOLEAN DEFAULT false,
  offline_timestamp TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON equipment_scan_events TO authenticated;

CREATE INDEX IF NOT EXISTS idx_equipment_scan_events_company
ON equipment_scan_events(company_id);

CREATE INDEX IF NOT EXISTS idx_equipment_scan_events_equipment
ON equipment_scan_events(equipment_id);

CREATE INDEX IF NOT EXISTS idx_equipment_scan_events_user
ON equipment_scan_events(scanned_by);

CREATE INDEX IF NOT EXISTS idx_equipment_scan_events_type
ON equipment_scan_events(scan_type);

CREATE INDEX IF NOT EXISTS idx_equipment_scan_events_date
ON equipment_scan_events(scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_equipment_scan_events_project
ON equipment_scan_events(project_id);

-- =====================================================
-- 3. Function: Generate QR Code Value for Equipment
-- =====================================================

CREATE OR REPLACE FUNCTION generate_equipment_qr_code(p_equipment_id UUID)
RETURNS JSON AS $$
DECLARE
  v_equipment equipment%ROWTYPE;
  v_qr_code_id UUID;
  v_qr_value TEXT;
  v_existing_qr equipment_qr_codes%ROWTYPE;
BEGIN
  -- Get equipment details
  SELECT * INTO v_equipment
  FROM equipment
  WHERE id = p_equipment_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Equipment not found'
    );
  END IF;

  -- Check if active QR code already exists
  SELECT * INTO v_existing_qr
  FROM equipment_qr_codes
  WHERE equipment_id = p_equipment_id
    AND is_active = true;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'existing', true,
      'qr_code_id', v_existing_qr.id,
      'qr_code_value', v_existing_qr.qr_code_value
    );
  END IF;

  -- Generate QR code value (JSON format)
  v_qr_value := json_build_object(
    'equipmentId', v_equipment.id,
    'companyId', v_equipment.company_id,
    'name', v_equipment.name,
    'serialNumber', v_equipment.serial_number,
    'type', 'equipment_checkout',
    'version', '1.0',
    'generatedAt', now()
  )::text;

  -- Insert QR code record
  INSERT INTO equipment_qr_codes (
    company_id,
    equipment_id,
    qr_code_value,
    qr_code_format,
    generated_by
  ) VALUES (
    v_equipment.company_id,
    p_equipment_id,
    v_qr_value,
    'json',
    auth.uid()
  )
  RETURNING id INTO v_qr_code_id;

  RETURN json_build_object(
    'success', true,
    'existing', false,
    'qr_code_id', v_qr_code_id,
    'qr_code_value', v_qr_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Function: Process QR Scan and Log Event
-- =====================================================

CREATE OR REPLACE FUNCTION process_equipment_qr_scan(
  p_qr_code_value TEXT,
  p_scan_type TEXT,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_accuracy DOUBLE PRECISION DEFAULT NULL,
  p_location_description TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_condition_rating TEXT DEFAULT NULL,
  p_hours_reading DOUBLE PRECISION DEFAULT NULL,
  p_fuel_level DOUBLE PRECISION DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_photo_urls TEXT[] DEFAULT NULL,
  p_due_back_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_qr_code equipment_qr_codes%ROWTYPE;
  v_equipment equipment%ROWTYPE;
  v_scan_event_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Look up QR code
  SELECT * INTO v_qr_code
  FROM equipment_qr_codes
  WHERE qr_code_value = p_qr_code_value
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or inactive QR code'
    );
  END IF;

  -- Get equipment
  SELECT * INTO v_equipment
  FROM equipment
  WHERE id = v_qr_code.equipment_id;

  -- Log scan event
  INSERT INTO equipment_scan_events (
    company_id,
    equipment_id,
    qr_code_id,
    scan_type,
    scanned_by,
    gps_latitude,
    gps_longitude,
    gps_accuracy,
    location_description,
    project_id,
    condition_rating,
    hours_reading,
    fuel_level,
    notes,
    photo_urls,
    due_back_at
  ) VALUES (
    v_qr_code.company_id,
    v_qr_code.equipment_id,
    v_qr_code.id,
    p_scan_type,
    v_user_id,
    p_latitude,
    p_longitude,
    p_accuracy,
    p_location_description,
    p_project_id,
    p_condition_rating,
    p_hours_reading,
    p_fuel_level,
    p_notes,
    p_photo_urls,
    p_due_back_at
  )
  RETURNING id INTO v_scan_event_id;

  -- Update QR code last scanned
  UPDATE equipment_qr_codes
  SET last_scanned_at = now(),
      scan_count = scan_count + 1
  WHERE id = v_qr_code.id;

  -- Update equipment status based on scan type
  IF p_scan_type = 'check_out' THEN
    UPDATE equipment
    SET status = 'checked_out',
        checked_out_by = v_user_id,
        checked_out_at = now(),
        due_back_at = p_due_back_at,
        current_location = COALESCE(p_location_description, current_location),
        current_condition = COALESCE(p_condition_rating, current_condition)
    WHERE id = v_qr_code.equipment_id;
  ELSIF p_scan_type = 'check_in' THEN
    UPDATE equipment
    SET status = 'available',
        checked_out_by = NULL,
        checked_out_at = NULL,
        due_back_at = NULL,
        current_location = COALESCE(p_location_description, current_location),
        current_condition = COALESCE(p_condition_rating, current_condition)
    WHERE id = v_qr_code.equipment_id;

    -- Mark scan event as checked in
    UPDATE equipment_scan_events
    SET checked_in_at = now()
    WHERE id = v_scan_event_id;
  ELSIF p_scan_type = 'location_update' THEN
    UPDATE equipment
    SET current_location = COALESCE(p_location_description, current_location)
    WHERE id = v_qr_code.equipment_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'scan_event_id', v_scan_event_id,
    'equipment_id', v_equipment.id,
    'equipment_name', v_equipment.name,
    'new_status', (SELECT status FROM equipment WHERE id = v_equipment.id),
    'message', format('Successfully logged %s for %s', p_scan_type, v_equipment.name)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. View: Equipment with QR Code Status
-- =====================================================

CREATE OR REPLACE VIEW equipment_with_qr AS
SELECT
  e.id as equipment_id,
  e.company_id,
  e.name,
  e.equipment_type,
  e.make,
  e.model,
  e.serial_number,
  e.status,
  e.current_condition,
  e.current_location,
  e.checked_out_by,
  e.checked_out_at,
  e.due_back_at,

  -- QR Code info
  qr.id as qr_code_id,
  qr.qr_code_value,
  qr.qr_code_image,
  qr.generated_at as qr_generated_at,
  qr.scan_count,
  qr.last_scanned_at,
  qr.is_active as qr_is_active,

  -- Has QR flag
  CASE WHEN qr.id IS NOT NULL THEN true ELSE false END as has_qr_code,

  -- Checked out by info
  up.full_name as checked_out_by_name,

  -- Overdue flag
  CASE
    WHEN e.status = 'checked_out' AND e.due_back_at < now()
    THEN true
    ELSE false
  END as is_overdue

FROM equipment e
LEFT JOIN equipment_qr_codes qr ON e.id = qr.equipment_id AND qr.is_active = true
LEFT JOIN user_profiles up ON e.checked_out_by = up.id;

GRANT SELECT ON equipment_with_qr TO authenticated;

-- =====================================================
-- 6. View: Recent Equipment Scans
-- =====================================================

CREATE OR REPLACE VIEW recent_equipment_scans AS
SELECT
  ese.id as scan_id,
  ese.scan_type,
  ese.scanned_at,
  ese.location_description,
  ese.condition_rating,
  ese.hours_reading,
  ese.fuel_level,
  ese.notes,
  ese.overdue_flag,

  -- Equipment info
  e.id as equipment_id,
  e.name as equipment_name,
  e.equipment_type,
  e.serial_number,

  -- User info
  up.id as scanned_by_id,
  up.full_name as scanned_by_name,
  up.email as scanned_by_email,

  -- Project info
  p.id as project_id,
  p.name as project_name,

  -- GPS data
  ese.gps_latitude,
  ese.gps_longitude,

  -- Time since scan
  EXTRACT(EPOCH FROM (now() - ese.scanned_at))/3600 as hours_since_scan

FROM equipment_scan_events ese
JOIN equipment e ON ese.equipment_id = e.id
JOIN user_profiles up ON ese.scanned_by = up.id
LEFT JOIN projects p ON ese.project_id = p.id
ORDER BY ese.scanned_at DESC;

GRANT SELECT ON recent_equipment_scans TO authenticated;

-- =====================================================
-- 7. View: Equipment Scan Analytics
-- =====================================================

CREATE OR REPLACE VIEW equipment_scan_analytics AS
SELECT
  e.id as equipment_id,
  e.name as equipment_name,
  e.equipment_type,

  -- Scan counts
  COUNT(ese.id) as total_scans,
  COUNT(ese.id) FILTER (WHERE ese.scan_type = 'check_out') as check_out_count,
  COUNT(ese.id) FILTER (WHERE ese.scan_type = 'check_in') as check_in_count,
  COUNT(ese.id) FILTER (WHERE ese.scan_type = 'inspection') as inspection_count,

  -- Last scan info
  MAX(ese.scanned_at) as last_scanned_at,

  -- Average condition
  AVG(
    CASE ese.condition_rating
      WHEN 'excellent' THEN 5
      WHEN 'good' THEN 4
      WHEN 'fair' THEN 3
      WHEN 'poor' THEN 2
      WHEN 'needs_repair' THEN 1
    END
  ) as average_condition_score,

  -- Most recent condition
  (
    SELECT condition_rating
    FROM equipment_scan_events
    WHERE equipment_id = e.id
      AND condition_rating IS NOT NULL
    ORDER BY scanned_at DESC
    LIMIT 1
  ) as latest_condition,

  -- Active users
  COUNT(DISTINCT ese.scanned_by) as unique_users,

  -- Has QR code
  CASE WHEN qr.id IS NOT NULL THEN true ELSE false END as has_qr_code

FROM equipment e
LEFT JOIN equipment_scan_events ese ON e.id = ese.equipment_id
LEFT JOIN equipment_qr_codes qr ON e.id = qr.equipment_id AND qr.is_active = true
GROUP BY e.id, e.name, e.equipment_type, qr.id;

GRANT SELECT ON equipment_scan_analytics TO authenticated;

-- =====================================================
-- 8. Trigger: Update Equipment Updated_At on Scan
-- =====================================================

CREATE OR REPLACE FUNCTION update_equipment_on_scan()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE equipment
  SET updated_at = now()
  WHERE id = NEW.equipment_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_equipment_on_scan ON equipment_scan_events;
CREATE TRIGGER trigger_update_equipment_on_scan
  AFTER INSERT ON equipment_scan_events
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_on_scan();

-- =====================================================
-- 9. RLS Policies
-- =====================================================

-- Equipment QR Codes
ALTER TABLE equipment_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company QR codes"
  ON equipment_qr_codes FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create QR codes"
  ON equipment_qr_codes FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update company QR codes"
  ON equipment_qr_codes FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Equipment Scan Events
ALTER TABLE equipment_scan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company scan events"
  ON equipment_scan_events FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create scan events"
  ON equipment_scan_events FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
    )
    AND scanned_by = auth.uid()
  );

-- =====================================================
-- 10. Comments for Documentation
-- =====================================================

COMMENT ON TABLE equipment_qr_codes IS 'Generated QR codes for equipment tracking and checkout';
COMMENT ON TABLE equipment_scan_events IS 'Complete log of all equipment QR code scans with GPS and condition tracking';

COMMENT ON FUNCTION generate_equipment_qr_code IS 'Generates a unique QR code for equipment, returns existing if already created';
COMMENT ON FUNCTION process_equipment_qr_scan IS 'Processes QR scan, logs event, updates equipment status, returns result JSON';

COMMENT ON VIEW equipment_with_qr IS 'Equipment records with QR code status and checkout information';
COMMENT ON VIEW recent_equipment_scans IS 'Recent scan events with equipment, user, and project context';
COMMENT ON VIEW equipment_scan_analytics IS 'Aggregated scan statistics per equipment with condition tracking';

COMMENT ON COLUMN equipment_qr_codes.qr_code_value IS 'JSON-encoded equipment data for QR code content';
COMMENT ON COLUMN equipment_scan_events.scan_type IS 'Type of scan: check_out, check_in, inspection, location_update, maintenance, verification';
COMMENT ON COLUMN equipment_scan_events.overdue_flag IS 'Set to true if equipment not returned by due date';
