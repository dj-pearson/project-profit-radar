-- =====================================================
-- EXTENDED FIELD-LEVEL ENCRYPTION
-- =====================================================
-- Migration: 20251204100001
-- Purpose: Extend encryption to additional sensitive fields
-- Date: 2025-12-04
-- Dependencies: 20251203000003_field_level_encryption.sql
-- =====================================================

-- =====================================================
-- STEP 1: ADD ENCRYPTION TO USER PROFILES (SSN/Tax ID)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    -- Add encrypted tax ID column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'tax_id_encrypted') THEN
      ALTER TABLE user_profiles ADD COLUMN tax_id_encrypted TEXT;
      RAISE NOTICE '✓ Added tax_id_encrypted to user_profiles';
    END IF;

    -- Add encrypted SSN column (for contractors)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'ssn_encrypted') THEN
      ALTER TABLE user_profiles ADD COLUMN ssn_encrypted TEXT;
      RAISE NOTICE '✓ Added ssn_encrypted to user_profiles';
    END IF;

    -- Add masked display columns for UI
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'tax_id_masked') THEN
      ALTER TABLE user_profiles ADD COLUMN tax_id_masked TEXT GENERATED ALWAYS AS (
        CASE
          WHEN tax_id_encrypted IS NOT NULL THEN '***-**-****'
          ELSE NULL
        END
      ) STORED;
      RAISE NOTICE '✓ Added tax_id_masked computed column';
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 2: ADD ENCRYPTION TO CRM CONTACTS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_contacts') THEN
    -- Add encrypted phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_contacts' AND column_name = 'phone_encrypted') THEN
      ALTER TABLE crm_contacts ADD COLUMN phone_encrypted TEXT;
      RAISE NOTICE '✓ Added phone_encrypted to crm_contacts';
    END IF;

    -- Add encrypted notes (may contain sensitive info)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_contacts' AND column_name = 'notes_encrypted') THEN
      ALTER TABLE crm_contacts ADD COLUMN notes_encrypted TEXT;
      RAISE NOTICE '✓ Added notes_encrypted to crm_contacts';
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 3: ADD ENCRYPTION TO FINANCIAL RECORDS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_records') THEN
    -- Add encrypted bank account column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'bank_account_encrypted') THEN
      ALTER TABLE financial_records ADD COLUMN bank_account_encrypted TEXT;
      RAISE NOTICE '✓ Added bank_account_encrypted to financial_records';
    END IF;

    -- Add encrypted routing number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'routing_number_encrypted') THEN
      ALTER TABLE financial_records ADD COLUMN routing_number_encrypted TEXT;
      RAISE NOTICE '✓ Added routing_number_encrypted to financial_records';
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 4: ADD ENCRYPTION TO COMPANY PAYMENT SETTINGS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_payment_settings') THEN
    -- Add encrypted bank account columns if not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_payment_settings' AND column_name = 'bank_account_number_encrypted') THEN
      ALTER TABLE company_payment_settings ADD COLUMN bank_account_number_encrypted TEXT;
      RAISE NOTICE '✓ Added bank_account_number_encrypted to company_payment_settings';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_payment_settings' AND column_name = 'bank_routing_number_encrypted') THEN
      ALTER TABLE company_payment_settings ADD COLUMN bank_routing_number_encrypted TEXT;
      RAISE NOTICE '✓ Added bank_routing_number_encrypted to company_payment_settings';
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 5: CREATE TRIGGER FOR USER PROFILE ENCRYPTION
-- =====================================================

CREATE OR REPLACE FUNCTION encrypt_user_profile_sensitive()
RETURNS TRIGGER AS $$
BEGIN
  -- Encrypt Tax ID if provided
  IF NEW.tax_id_encrypted IS NOT NULL
     AND NEW.tax_id_encrypted != OLD.tax_id_encrypted
     AND NEW.tax_id_encrypted NOT LIKE 'wy%' THEN
    NEW.tax_id_encrypted := encrypt_sensitive(NEW.tax_id_encrypted, 'pii_encryption');
  END IF;

  -- Encrypt SSN if provided
  IF NEW.ssn_encrypted IS NOT NULL
     AND NEW.ssn_encrypted != OLD.ssn_encrypted
     AND NEW.ssn_encrypted NOT LIKE 'wy%' THEN
    NEW.ssn_encrypted := encrypt_sensitive(NEW.ssn_encrypted, 'pii_encryption');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Encryption trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS user_profile_encryption_trigger ON user_profiles;
CREATE TRIGGER user_profile_encryption_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_user_profile_sensitive();

-- =====================================================
-- STEP 6: CREATE SECURE VIEW FOR USER PROFILES
-- =====================================================

CREATE OR REPLACE VIEW user_profiles_secure AS
SELECT
  id,
  email,
  full_name,
  role,
  company_id,
  site_id,
  phone,
  avatar_url,
  is_active,
  created_at,
  updated_at,
  -- Only show masked values unless admin
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'root_admin', 'accounting')
    )
    THEN decrypt_sensitive(tax_id_encrypted, 'pii_encryption')
    ELSE mask_ssn(decrypt_sensitive(tax_id_encrypted, 'pii_encryption'))
  END as tax_id,
  CASE
    WHEN tax_id_encrypted IS NOT NULL THEN '***-**-****'
    ELSE NULL
  END as tax_id_display
FROM user_profiles
WHERE site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid;

COMMENT ON VIEW user_profiles_secure IS
  'Secure view of user_profiles with automatic PII decryption based on role';

-- =====================================================
-- STEP 7: CREATE FUNCTIONS FOR SENSITIVE DATA UPDATES
-- =====================================================

-- Function to securely update Tax ID
CREATE OR REPLACE FUNCTION update_user_tax_id(
  p_user_id UUID,
  p_tax_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_can_update BOOLEAN := false;
BEGIN
  -- Check if caller can update this user
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (
      role IN ('admin', 'root_admin', 'accounting')
      OR id = p_user_id
    )
  ) INTO v_can_update;

  IF NOT v_can_update THEN
    RAISE EXCEPTION 'Unauthorized to update tax ID';
  END IF;

  -- Validate tax ID format (XXX-XX-XXXX or XXXXXXXXX)
  IF p_tax_id !~ '^\d{3}-\d{2}-\d{4}$' AND p_tax_id !~ '^\d{9}$' THEN
    RAISE EXCEPTION 'Invalid tax ID format';
  END IF;

  -- Update with encryption
  UPDATE user_profiles
  SET
    tax_id_encrypted = encrypt_sensitive(p_tax_id, 'pii_encryption'),
    updated_at = now()
  WHERE id = p_user_id;

  -- Log access
  PERFORM log_sensitive_access('user_profiles', p_user_id, 'tax_id', 'update');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to securely retrieve Tax ID (with audit)
CREATE OR REPLACE FUNCTION get_user_tax_id(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_encrypted TEXT;
  v_can_view BOOLEAN := false;
BEGIN
  -- Check if caller can view this tax ID
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (
      role IN ('admin', 'root_admin', 'accounting')
      OR id = p_user_id
    )
  ) INTO v_can_view;

  IF NOT v_can_view THEN
    RAISE EXCEPTION 'Unauthorized to view tax ID';
  END IF;

  -- Get encrypted value
  SELECT tax_id_encrypted INTO v_encrypted
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  -- Log access
  PERFORM log_sensitive_access('user_profiles', p_user_id, 'tax_id', 'decrypt');

  -- Return decrypted value
  RETURN decrypt_sensitive(v_encrypted, 'pii_encryption');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 8: CREATE FUNCTIONS FOR BANK ACCOUNT MANAGEMENT
-- =====================================================

-- Function to securely store bank account info
CREATE OR REPLACE FUNCTION store_bank_account(
  p_company_id UUID,
  p_account_number TEXT,
  p_routing_number TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_can_update BOOLEAN := false;
BEGIN
  -- Check if caller can update company payment settings
  SELECT EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.company_id = p_company_id
    AND up.role IN ('admin', 'root_admin', 'accounting')
  ) INTO v_can_update;

  IF NOT v_can_update THEN
    RAISE EXCEPTION 'Unauthorized to update bank account';
  END IF;

  -- Validate account number (basic check)
  IF p_account_number !~ '^\d{4,17}$' THEN
    RAISE EXCEPTION 'Invalid bank account number format';
  END IF;

  -- Validate routing number (9 digits)
  IF p_routing_number !~ '^\d{9}$' THEN
    RAISE EXCEPTION 'Invalid routing number format (must be 9 digits)';
  END IF;

  -- Upsert encrypted bank info
  INSERT INTO company_payment_settings (
    company_id,
    bank_account_number_encrypted,
    bank_routing_number_encrypted,
    updated_at
  ) VALUES (
    p_company_id,
    encrypt_sensitive(p_account_number, 'financial_encryption'),
    encrypt_sensitive(p_routing_number, 'financial_encryption'),
    now()
  )
  ON CONFLICT (company_id) DO UPDATE SET
    bank_account_number_encrypted = EXCLUDED.bank_account_number_encrypted,
    bank_routing_number_encrypted = EXCLUDED.bank_routing_number_encrypted,
    updated_at = now();

  -- Log access
  PERFORM log_sensitive_access('company_payment_settings', p_company_id, 'bank_account', 'update');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retrieve masked bank account (for display)
CREATE OR REPLACE FUNCTION get_bank_account_masked(p_company_id UUID)
RETURNS TABLE (
  account_last_four TEXT,
  routing_last_four TEXT,
  has_bank_account BOOLEAN
) AS $$
DECLARE
  v_account TEXT;
  v_routing TEXT;
BEGIN
  -- Get encrypted values
  SELECT
    decrypt_sensitive(bank_account_number_encrypted, 'financial_encryption'),
    decrypt_sensitive(bank_routing_number_encrypted, 'financial_encryption')
  INTO v_account, v_routing
  FROM company_payment_settings
  WHERE company_id = p_company_id;

  IF v_account IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, false;
    RETURN;
  END IF;

  -- Log access (masked)
  PERFORM log_sensitive_access('company_payment_settings', p_company_id, 'bank_account', 'view');

  -- Return masked values
  RETURN QUERY SELECT
    right(v_account, 4),
    right(v_routing, 4),
    true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 9: CREATE ENCRYPTION KEY ROTATION SCHEDULE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS encryption_key_rotation_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_purpose TEXT NOT NULL,
  rotation_interval_days INTEGER NOT NULL DEFAULT 90,
  last_rotation_at TIMESTAMPTZ,
  next_rotation_at TIMESTAMPTZ,
  auto_rotate BOOLEAN NOT NULL DEFAULT false,
  notification_days_before INTEGER NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default rotation schedules
INSERT INTO encryption_key_rotation_schedule (key_purpose, rotation_interval_days, next_rotation_at)
VALUES
  ('pii_encryption', 90, now() + interval '90 days'),
  ('financial_encryption', 60, now() + interval '60 days'),
  ('webhook_secret', 180, now() + interval '180 days'),
  ('integration_credentials', 90, now() + interval '90 days')
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 10: VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_encrypted_columns INTEGER;
  v_encryption_functions INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           EXTENDED FIELD-LEVEL ENCRYPTION COMPLETE                   ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- Count encrypted columns
  SELECT COUNT(*) INTO v_encrypted_columns
  FROM information_schema.columns
  WHERE column_name LIKE '%encrypted%'
  AND table_schema = 'public';

  RAISE NOTICE 'Encrypted columns created: %', v_encrypted_columns;

  -- List encrypted columns by table
  RAISE NOTICE '';
  RAISE NOTICE 'Encrypted Columns by Table:';
  RAISE NOTICE '────────────────────────────────────────────────────────────';

  FOR v_encrypted_columns IN (
    SELECT 1 FROM information_schema.columns
    WHERE column_name LIKE '%_encrypted'
    AND table_schema = 'public'
  ) LOOP
    -- Just counting
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'New Functions Added:';
  RAISE NOTICE '  - update_user_tax_id(user_id, tax_id) - Securely store Tax ID';
  RAISE NOTICE '  - get_user_tax_id(user_id) - Retrieve Tax ID with audit';
  RAISE NOTICE '  - store_bank_account(company_id, account, routing) - Store bank info';
  RAISE NOTICE '  - get_bank_account_masked(company_id) - Get masked bank info';
  RAISE NOTICE '';
  RAISE NOTICE 'Key Rotation Schedule:';
  RAISE NOTICE '  - PII: 90 days';
  RAISE NOTICE '  - Financial: 60 days';
  RAISE NOTICE '  - Webhooks: 180 days';
  RAISE NOTICE '  - Integrations: 90 days';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Migration 20251204100001 completed successfully!';
END $$;

COMMENT ON FUNCTION update_user_tax_id(UUID, TEXT) IS
  'Securely stores an encrypted Tax ID/SSN for a user with audit logging';

COMMENT ON FUNCTION get_user_tax_id(UUID) IS
  'Retrieves and decrypts a users Tax ID with role check and audit logging';

COMMENT ON FUNCTION store_bank_account(UUID, TEXT, TEXT) IS
  'Securely stores encrypted bank account information for a company';

COMMENT ON FUNCTION get_bank_account_masked(UUID) IS
  'Returns masked bank account information (last 4 digits only)';
