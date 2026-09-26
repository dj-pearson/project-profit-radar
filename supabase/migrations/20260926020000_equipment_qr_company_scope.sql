-- Equipment QR: company scoping, a broken scan type, and QR generation.
--
-- Found while building equipment check-out in the native iOS app. Every item
-- is a same-signature CREATE OR REPLACE or an additive trigger; no column,
-- parameter or return shape changes.
--
-- 1. generate_equipment_qr_code and process_equipment_qr_scan are SECURITY
--    DEFINER and never checked the caller's company. Anyone signed in who had
--    (or guessed) a QR value could log scans against another company's
--    equipment and flip its status, and generate_equipment_qr_code would mint
--    a label for any equipment id. Both now answer a foreign id or label
--    exactly as they answer an unknown one. A scan's project must belong to
--    the equipment's company.
--    Tightening, done in one step because what it removes is cross-tenant
--    writes; no client is meant to scan another company's equipment.
--
-- 2. The location_update branch wrote equipment.current_location, which does
--    not exist (the column is location), so every location_update scan
--    raised. It now writes location, as check_out and check_in already did.
--
-- 3. equipment_qr_codes.site_id was made NOT NULL (20251128000003) and
--    generate_equipment_qr_code never supplies it, so QR generation failed
--    wherever that constraint applied. A BEFORE INSERT trigger fills it from
--    the company, the same fix 20260903010000 made for projects. A caller that
--    sends site_id keeps it. Created only where the column exists.
--
-- 4. equipment_with_qr and recent_equipment_scans run as their owner, so RLS
--    never applied, and neither filtered by company. recent_equipment_scans
--    returned every company's scans with the scanner's email. Both now filter
--    on the caller's company inside the view (root_admin still sees all), and
--    the scanner's email is shown only to the scanner and to managers. Same
--    columns and order.

-- ---------------------------------------------------------------------------
-- 1 + 3a. generate_equipment_qr_code
-- ---------------------------------------------------------------------------
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

  -- Same answer as a missing row: don't confirm another company's ids.
  IF NOT COALESCE(get_user_company(auth.uid()) = v_equipment.company_id OR get_user_role(auth.uid()) = 'root_admin'::user_role, false) THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- 1 + 2. process_equipment_qr_scan
-- ---------------------------------------------------------------------------
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

  -- A label from another company reads as unknown, same as a bad code.
  IF NOT COALESCE(get_user_company(auth.uid()) = v_qr_code.company_id OR get_user_role(auth.uid()) = 'root_admin'::user_role, false) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or inactive QR code'
    );
  END IF;

  IF p_project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND company_id = v_qr_code.company_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Project not found'
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
    SET status = 'in_use',
        location = COALESCE(p_location_description, location)
    WHERE id = v_qr_code.equipment_id;
  ELSIF p_scan_type = 'check_in' THEN
    UPDATE equipment
    SET status = 'available',
        location = COALESCE(p_location_description, location)
    WHERE id = v_qr_code.equipment_id;

    -- Mark scan event as checked in
    UPDATE equipment_scan_events
    SET checked_in_at = now()
    WHERE id = v_scan_event_id;
  ELSIF p_scan_type = 'location_update' THEN
    UPDATE equipment
    SET location = COALESCE(p_location_description, location)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Supabase's default privileges grant EXECUTE on public functions to anon.
-- Both need a signed-in caller (or the service role).
REVOKE ALL ON FUNCTION generate_equipment_qr_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_equipment_qr_code(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION process_equipment_qr_scan(text, text, double precision, double precision, double precision, text, uuid, text, double precision, double precision, text, text[], timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION process_equipment_qr_scan(text, text, double precision, double precision, double precision, text, uuid, text, double precision, double precision, text, text[], timestamptz) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. equipment_qr_codes.site_id from the company
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_equipment_qr_site_id_from_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.site_id IS NULL AND NEW.company_id IS NOT NULL THEN
    SELECT c.site_id INTO NEW.site_id
    FROM public.companies c
    WHERE c.id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'equipment_qr_codes' AND column_name = 'site_id'
  ) THEN
    DROP TRIGGER IF EXISTS trg_equipment_qr_site_id ON public.equipment_qr_codes;
    CREATE TRIGGER trg_equipment_qr_site_id
      BEFORE INSERT ON public.equipment_qr_codes
      FOR EACH ROW
      EXECUTE FUNCTION public.set_equipment_qr_site_id_from_company();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Views scoped to the caller's company
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW equipment_with_qr AS
SELECT
  e.id as equipment_id,
  e.company_id,
  e.name,
  e.equipment_type,
  e.model,
  e.serial_number,
  e.status,
  e.location,

  -- QR Code info
  qr.id as qr_code_id,
  qr.qr_code_value,
  qr.qr_code_image,
  qr.generated_at as qr_generated_at,
  qr.scan_count,
  qr.last_scanned_at,
  qr.is_active as qr_is_active,

  -- Has QR flag
  CASE WHEN qr.id IS NOT NULL THEN true ELSE false END as has_qr_code

FROM public.equipment e
LEFT JOIN equipment_qr_codes qr ON e.id = qr.equipment_id AND qr.is_active = true
WHERE (get_user_company(auth.uid()) = e.company_id OR get_user_role(auth.uid()) = 'root_admin'::user_role);

GRANT SELECT ON equipment_with_qr TO authenticated;

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
  CONCAT(up.first_name, ' ', up.last_name) as scanned_by_name,
  -- Contact details only for the scanner themselves and managers:
  -- user_profiles hides them from other roles, and this view runs as its
  -- owner, so it has to mask them itself.
  CASE
    WHEN up.id = auth.uid()
      OR get_user_role(auth.uid()) IN ('root_admin'::user_role, 'admin'::user_role, 'project_manager'::user_role)
    THEN up.email
  END as scanned_by_email,

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
WHERE (get_user_company(auth.uid()) = ese.company_id OR get_user_role(auth.uid()) = 'root_admin'::user_role)
ORDER BY ese.scanned_at DESC;

GRANT SELECT ON recent_equipment_scans TO authenticated;
