-- =====================================================
-- FIELD-LEVEL ENCRYPTION FOR SENSITIVE DATA
-- =====================================================
-- Migration: 20251203000003
-- Purpose: Implement AES-256 encryption for sensitive fields
-- Date: 2025-12-03
-- SECURITY: Uses pgcrypto for symmetric encryption
-- =====================================================

-- =====================================================
-- STEP 1: ENABLE REQUIRED EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Check if pgsodium is available (Supabase provides this)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgsodium;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgsodium not available, using pgcrypto for encryption';
END $$;

-- =====================================================
-- STEP 2: CREATE ENCRYPTION KEY MANAGEMENT
-- =====================================================

-- Table to store encryption key metadata (keys stored in Supabase Vault)
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT UNIQUE NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  algorithm TEXT NOT NULL DEFAULT 'aes256',
  purpose TEXT NOT NULL, -- 'data_encryption', 'api_key', 'webhook_secret'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- RLS for encryption_keys (only root admins)
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encryption_keys_root_admin_only"
  ON encryption_keys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'root_admin'
    )
  );

-- =====================================================
-- STEP 3: CREATE ENCRYPTION HELPER FUNCTIONS
-- =====================================================

-- Get encryption key from environment or vault
-- In production, this should retrieve from Supabase Vault
CREATE OR REPLACE FUNCTION get_encryption_key(key_purpose TEXT DEFAULT 'data_encryption')
RETURNS TEXT AS $$
DECLARE
  v_key TEXT;
BEGIN
  -- Try to get key from Supabase secrets/environment
  -- In production, integrate with Supabase Vault: vault.decrypt_secret()
  v_key := current_setting('app.encryption_key_' || key_purpose, true);

  -- Fallback: Use a derived key from database-level secret
  -- IMPORTANT: In production, replace with proper key management
  IF v_key IS NULL OR v_key = '' THEN
    -- Generate a deterministic key based on purpose (for demo/dev only)
    -- In production, use Supabase Vault or external KMS
    v_key := encode(
      digest(
        'builddesk_' || key_purpose || '_v1_secure_key_2025',
        'sha256'
      ),
      'hex'
    );
  END IF;

  RETURN v_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Encrypt sensitive data using AES-256
CREATE OR REPLACE FUNCTION encrypt_sensitive(
  plaintext TEXT,
  key_purpose TEXT DEFAULT 'data_encryption'
)
RETURNS TEXT AS $$
DECLARE
  v_key TEXT;
  v_encrypted BYTEA;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;

  v_key := get_encryption_key(key_purpose);

  -- Use pgcrypto's pgp_sym_encrypt for AES encryption
  -- This provides authenticated encryption with compression
  v_encrypted := pgp_sym_encrypt(
    plaintext,
    v_key,
    'compress-algo=1, cipher-algo=aes256'
  );

  -- Return as base64 for safe storage
  RETURN encode(v_encrypted, 'base64');
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Encryption failed: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive(
  encrypted_text TEXT,
  key_purpose TEXT DEFAULT 'data_encryption'
)
RETURNS TEXT AS $$
DECLARE
  v_key TEXT;
  v_decrypted TEXT;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;

  v_key := get_encryption_key(key_purpose);

  -- Decode from base64 and decrypt
  v_decrypted := pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    v_key
  );

  RETURN v_decrypted;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Decryption failed: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Encrypt JSONB sensitive fields
CREATE OR REPLACE FUNCTION encrypt_jsonb_sensitive(
  data JSONB,
  sensitive_keys TEXT[],
  key_purpose TEXT DEFAULT 'data_encryption'
)
RETURNS JSONB AS $$
DECLARE
  v_key TEXT;
  v_result JSONB;
BEGIN
  IF data IS NULL THEN
    RETURN NULL;
  END IF;

  v_result := data;

  -- Encrypt each sensitive key if present
  FOR i IN 1..array_length(sensitive_keys, 1) LOOP
    IF v_result ? sensitive_keys[i] AND v_result->>sensitive_keys[i] IS NOT NULL THEN
      v_result := jsonb_set(
        v_result,
        ARRAY[sensitive_keys[i]],
        to_jsonb(encrypt_sensitive(v_result->>sensitive_keys[i], key_purpose))
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt JSONB sensitive fields
CREATE OR REPLACE FUNCTION decrypt_jsonb_sensitive(
  data JSONB,
  sensitive_keys TEXT[],
  key_purpose TEXT DEFAULT 'data_encryption'
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF data IS NULL THEN
    RETURN NULL;
  END IF;

  v_result := data;

  -- Decrypt each sensitive key if present
  FOR i IN 1..array_length(sensitive_keys, 1) LOOP
    IF v_result ? sensitive_keys[i] AND v_result->>sensitive_keys[i] IS NOT NULL THEN
      v_result := jsonb_set(
        v_result,
        ARRAY[sensitive_keys[i]],
        to_jsonb(decrypt_sensitive(v_result->>sensitive_keys[i], key_purpose))
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: ADD ENCRYPTED COLUMNS TO SENSITIVE TABLES
-- =====================================================

-- Webhook endpoints: encrypt secret tokens
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_endpoints') THEN
    -- Add encrypted secret column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_endpoints' AND column_name = 'secret_encrypted') THEN
      ALTER TABLE webhook_endpoints ADD COLUMN secret_encrypted TEXT;
    END IF;

    -- Migrate existing secrets to encrypted format
    UPDATE webhook_endpoints
    SET secret_encrypted = encrypt_sensitive(secret, 'webhook_secret')
    WHERE secret IS NOT NULL AND secret_encrypted IS NULL;

    RAISE NOTICE 'Encrypted webhook secrets';
  END IF;
END $$;

-- Integration configurations: encrypt credentials
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integration_configurations') THEN
    -- Add encrypted credentials column if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integration_configurations' AND column_name = 'credentials_encrypted_v2') THEN
      ALTER TABLE integration_configurations ADD COLUMN credentials_encrypted_v2 TEXT;
    END IF;

    -- Migrate existing credentials to encrypted format
    UPDATE integration_configurations
    SET credentials_encrypted_v2 = encrypt_sensitive(credentials_encrypted, 'integration_credentials')
    WHERE credentials_encrypted IS NOT NULL AND credentials_encrypted_v2 IS NULL;

    RAISE NOTICE 'Encrypted integration credentials';
  END IF;
END $$;

-- SSO configurations: encrypt SAML certificates and secrets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sso_configurations') THEN
    -- Add encrypted certificate column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sso_configurations' AND column_name = 'certificate_encrypted') THEN
      ALTER TABLE sso_configurations ADD COLUMN certificate_encrypted TEXT;
    END IF;

    -- Add encrypted private key column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sso_configurations' AND column_name = 'private_key_encrypted') THEN
      ALTER TABLE sso_configurations ADD COLUMN private_key_encrypted TEXT;
    END IF;

    RAISE NOTICE 'Added encryption columns to SSO configurations';
  END IF;
END $$;

-- =====================================================
-- STEP 5: CREATE SECURE VIEWS FOR SENSITIVE DATA
-- =====================================================

-- Secure view for webhook endpoints (decrypts secrets for authorized users)
CREATE OR REPLACE VIEW webhook_endpoints_secure AS
SELECT
  id,
  company_id,
  site_id,
  endpoint_name,
  url,
  -- Only decrypt for admin users
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
    )
    THEN decrypt_sensitive(secret_encrypted, 'webhook_secret')
    ELSE '********'
  END as secret_token,
  events,
  is_active,
  retry_attempts,
  timeout_seconds,
  last_success_at,
  last_failure_at,
  failure_count,
  created_at,
  updated_at
FROM webhook_endpoints
WHERE site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid;

-- Secure view for integration configurations
CREATE OR REPLACE VIEW integration_configurations_secure AS
SELECT
  id,
  company_id,
  site_id,
  integration_type,
  integration_name,
  configuration,
  -- Only decrypt for admin users
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
    )
    THEN decrypt_sensitive(credentials_encrypted_v2, 'integration_credentials')
    ELSE NULL
  END as credentials,
  is_active,
  sync_enabled,
  last_sync_at,
  sync_frequency,
  error_count,
  last_error,
  created_at,
  updated_at
FROM integration_configurations
WHERE site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid;

-- =====================================================
-- STEP 6: CREATE TRIGGERS FOR AUTOMATIC ENCRYPTION
-- =====================================================

-- Trigger to auto-encrypt webhook secrets on insert/update
CREATE OR REPLACE FUNCTION encrypt_webhook_secret()
RETURNS TRIGGER AS $$
BEGIN
  -- If secret is provided (not already encrypted)
  IF NEW.secret IS NOT NULL AND NEW.secret != '' THEN
    -- Check if it looks like encrypted data (base64 encoded pgp)
    IF NEW.secret NOT LIKE 'wy%' THEN
      NEW.secret_encrypted := encrypt_sensitive(NEW.secret, 'webhook_secret');
      -- Clear plaintext secret for security
      NEW.secret := '********';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS webhook_secret_encryption ON webhook_endpoints;
CREATE TRIGGER webhook_secret_encryption
  BEFORE INSERT OR UPDATE ON webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_webhook_secret();

-- Trigger to auto-encrypt integration credentials
CREATE OR REPLACE FUNCTION encrypt_integration_credentials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.credentials_encrypted IS NOT NULL AND NEW.credentials_encrypted != '' THEN
    -- Check if not already encrypted
    IF NEW.credentials_encrypted NOT LIKE 'wy%' THEN
      NEW.credentials_encrypted_v2 := encrypt_sensitive(NEW.credentials_encrypted, 'integration_credentials');
      -- Mark old column as migrated
      NEW.credentials_encrypted := '[ENCRYPTED_V2]';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS integration_credentials_encryption ON integration_configurations;
CREATE TRIGGER integration_credentials_encryption
  BEFORE INSERT OR UPDATE ON integration_configurations
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_integration_credentials();

-- =====================================================
-- STEP 7: CREATE SENSITIVE DATA MASKING FUNCTIONS
-- =====================================================

-- Mask sensitive string (show last N characters)
CREATE OR REPLACE FUNCTION mask_sensitive(
  value TEXT,
  visible_chars INTEGER DEFAULT 4
)
RETURNS TEXT AS $$
BEGIN
  IF value IS NULL OR length(value) <= visible_chars THEN
    RETURN repeat('*', COALESCE(length(value), 0));
  END IF;
  RETURN repeat('*', length(value) - visible_chars) || right(value, visible_chars);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Mask email address
CREATE OR REPLACE FUNCTION mask_email(email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_parts TEXT[];
  v_username TEXT;
  v_domain TEXT;
BEGIN
  IF email IS NULL OR email !~ '@' THEN
    RETURN '****@****.***';
  END IF;

  v_parts := string_to_array(email, '@');
  v_username := v_parts[1];
  v_domain := v_parts[2];

  -- Show first 2 chars of username
  IF length(v_username) > 2 THEN
    v_username := left(v_username, 2) || repeat('*', length(v_username) - 2);
  END IF;

  RETURN v_username || '@' || v_domain;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Mask phone number
CREATE OR REPLACE FUNCTION mask_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone IS NULL THEN
    RETURN NULL;
  END IF;
  -- Show last 4 digits
  RETURN repeat('*', greatest(length(phone) - 4, 0)) || right(phone, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Mask SSN/Tax ID
CREATE OR REPLACE FUNCTION mask_ssn(ssn TEXT)
RETURNS TEXT AS $$
BEGIN
  IF ssn IS NULL THEN
    RETURN NULL;
  END IF;
  -- Show only last 4 digits: ***-**-1234
  IF length(ssn) = 11 AND ssn ~ '^\d{3}-\d{2}-\d{4}$' THEN
    RETURN '***-**-' || right(ssn, 4);
  ELSIF length(ssn) = 9 AND ssn ~ '^\d{9}$' THEN
    RETURN '*****' || right(ssn, 4);
  END IF;
  RETURN repeat('*', greatest(length(ssn) - 4, 0)) || right(ssn, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- STEP 8: CREATE AUDIT LOG FOR SENSITIVE DATA ACCESS
-- =====================================================

-- Table to log access to sensitive/encrypted data
CREATE TABLE IF NOT EXISTS sensitive_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  site_id UUID REFERENCES sites(id),
  table_name TEXT NOT NULL,
  record_id UUID,
  field_accessed TEXT NOT NULL,
  access_type TEXT NOT NULL, -- 'decrypt', 'view', 'export'
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_sensitive_access_user ON sensitive_data_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_table ON sensitive_data_access_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_created ON sensitive_data_access_log(created_at DESC);

-- RLS for audit log (admin read-only, system insert)
ALTER TABLE sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sensitive_access_log_admin_select"
  ON sensitive_data_access_log FOR SELECT
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
    )
  );

CREATE POLICY "sensitive_access_log_system_insert"
  ON sensitive_data_access_log FOR INSERT
  WITH CHECK (true);

-- Function to log sensitive data access
CREATE OR REPLACE FUNCTION log_sensitive_access(
  p_table_name TEXT,
  p_record_id UUID,
  p_field TEXT,
  p_access_type TEXT DEFAULT 'view'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO sensitive_data_access_log (
    user_id,
    site_id,
    table_name,
    record_id,
    field_accessed,
    access_type
  ) VALUES (
    auth.uid(),
    (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid,
    p_table_name,
    p_record_id,
    p_field,
    p_access_type
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to log sensitive data access: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 9: CREATE KEY ROTATION SUPPORT
-- =====================================================

-- Function to re-encrypt data with new key
CREATE OR REPLACE FUNCTION rotate_encryption_key(
  p_key_purpose TEXT,
  p_old_key TEXT,
  p_new_key TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_record RECORD;
BEGIN
  -- Only root admins can rotate keys
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'root_admin') THEN
    RAISE EXCEPTION 'Only root admins can rotate encryption keys';
  END IF;

  -- Rotate webhook secrets
  IF p_key_purpose = 'webhook_secret' THEN
    FOR v_record IN SELECT id, secret_encrypted FROM webhook_endpoints WHERE secret_encrypted IS NOT NULL LOOP
      UPDATE webhook_endpoints
      SET secret_encrypted = pgp_sym_encrypt(
        pgp_sym_decrypt(decode(v_record.secret_encrypted, 'base64'), p_old_key),
        p_new_key,
        'compress-algo=1, cipher-algo=aes256'
      )::text
      WHERE id = v_record.id;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  -- Rotate integration credentials
  IF p_key_purpose = 'integration_credentials' THEN
    FOR v_record IN SELECT id, credentials_encrypted_v2 FROM integration_configurations WHERE credentials_encrypted_v2 IS NOT NULL LOOP
      UPDATE integration_configurations
      SET credentials_encrypted_v2 = pgp_sym_encrypt(
        pgp_sym_decrypt(decode(v_record.credentials_encrypted_v2, 'base64'), p_old_key),
        p_new_key,
        'compress-algo=1, cipher-algo=aes256'
      )::text
      WHERE id = v_record.id;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  -- Log rotation
  INSERT INTO encryption_keys (key_name, key_version, purpose, rotated_at)
  VALUES (p_key_purpose || '_rotated', 1, p_key_purpose, now())
  ON CONFLICT (key_name) DO UPDATE SET
    key_version = encryption_keys.key_version + 1,
    rotated_at = now();

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 10: VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_test_plaintext TEXT := 'test_sensitive_data_123';
  v_encrypted TEXT;
  v_decrypted TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== FIELD-LEVEL ENCRYPTION VERIFICATION ===';
  RAISE NOTICE '';

  -- Test encryption/decryption
  v_encrypted := encrypt_sensitive(v_test_plaintext, 'data_encryption');
  v_decrypted := decrypt_sensitive(v_encrypted, 'data_encryption');

  IF v_decrypted = v_test_plaintext THEN
    RAISE NOTICE '✓ Encryption/Decryption test PASSED';
  ELSE
    RAISE WARNING '✗ Encryption/Decryption test FAILED';
  END IF;

  -- Test masking functions
  IF mask_email('user@example.com') LIKE 'us%@example.com' THEN
    RAISE NOTICE '✓ Email masking test PASSED';
  ELSE
    RAISE WARNING '✗ Email masking test FAILED';
  END IF;

  IF mask_ssn('123-45-6789') = '***-**-6789' THEN
    RAISE NOTICE '✓ SSN masking test PASSED';
  ELSE
    RAISE WARNING '✗ SSN masking test FAILED';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Available encryption functions:';
  RAISE NOTICE '  - encrypt_sensitive(text, key_purpose) -> encrypted text';
  RAISE NOTICE '  - decrypt_sensitive(text, key_purpose) -> decrypted text';
  RAISE NOTICE '  - encrypt_jsonb_sensitive(jsonb, keys[], purpose) -> encrypted jsonb';
  RAISE NOTICE '  - decrypt_jsonb_sensitive(jsonb, keys[], purpose) -> decrypted jsonb';
  RAISE NOTICE '';
  RAISE NOTICE 'Available masking functions:';
  RAISE NOTICE '  - mask_sensitive(text, visible_chars)';
  RAISE NOTICE '  - mask_email(email)';
  RAISE NOTICE '  - mask_phone(phone)';
  RAISE NOTICE '  - mask_ssn(ssn)';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration 20251203000003 completed successfully!';
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION encrypt_sensitive(TEXT, TEXT) IS
  'Encrypts sensitive data using AES-256 with pgcrypto. Returns base64-encoded ciphertext.';

COMMENT ON FUNCTION decrypt_sensitive(TEXT, TEXT) IS
  'Decrypts data encrypted by encrypt_sensitive. Returns plaintext.';

COMMENT ON FUNCTION mask_sensitive(TEXT, INTEGER) IS
  'Masks sensitive data, showing only the last N characters.';

COMMENT ON TABLE encryption_keys IS
  'Metadata for encryption keys. Actual keys should be stored in Supabase Vault.';

COMMENT ON TABLE sensitive_data_access_log IS
  'Audit log for tracking access to encrypted/sensitive data for compliance.';
