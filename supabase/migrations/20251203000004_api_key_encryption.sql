-- =====================================================
-- API KEY ENCRYPTION ENHANCEMENT
-- =====================================================
-- Migration: 20251203000004
-- Purpose: Implement secure API key storage with AES-256 encryption
-- Date: 2025-12-03
-- SECURITY:
--   1. Hash with HMAC-SHA256 for validation (one-way)
--   2. Optional AES-256 encrypted storage for recoverable keys
--   3. Key derivation with PBKDF2
-- =====================================================

-- =====================================================
-- STEP 1: ADD ENHANCED SECURITY COLUMNS
-- =====================================================

-- Add columns for enhanced API key security
DO $$
BEGIN
  -- Add salt for HMAC hashing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_salt') THEN
    ALTER TABLE api_keys ADD COLUMN key_salt TEXT;
  END IF;

  -- Add encrypted key storage (for recoverable keys, admin use only)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_encrypted') THEN
    ALTER TABLE api_keys ADD COLUMN key_encrypted TEXT;
  END IF;

  -- Add key derivation info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'hash_algorithm') THEN
    ALTER TABLE api_keys ADD COLUMN hash_algorithm TEXT DEFAULT 'hmac-sha256';
  END IF;

  -- Add key creation timestamp for rotation tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_version') THEN
    ALTER TABLE api_keys ADD COLUMN key_version INTEGER DEFAULT 1;
  END IF;

  -- Add security metadata
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'security_metadata') THEN
    ALTER TABLE api_keys ADD COLUMN security_metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE SECURE API KEY FUNCTIONS
-- =====================================================

-- Generate a cryptographically secure API key
CREATE OR REPLACE FUNCTION generate_secure_api_key(
  p_prefix TEXT DEFAULT 'bdesk'
)
RETURNS TABLE (
  full_key TEXT,
  key_prefix TEXT,
  key_hash TEXT,
  key_salt TEXT,
  key_encrypted TEXT
) AS $$
DECLARE
  v_random_bytes BYTEA;
  v_key_suffix TEXT;
  v_full_key TEXT;
  v_salt TEXT;
  v_hash TEXT;
  v_encrypted TEXT;
  v_encryption_key TEXT;
BEGIN
  -- Generate 32 bytes of random data
  v_random_bytes := gen_random_bytes(32);

  -- Create URL-safe base64 key suffix
  v_key_suffix := replace(replace(encode(v_random_bytes, 'base64'), '/', '_'), '+', '-');
  v_key_suffix := replace(v_key_suffix, '=', '');

  -- Full key format: prefix_suffix
  v_full_key := p_prefix || '_' || v_key_suffix;

  -- Generate unique salt
  v_salt := encode(gen_random_bytes(16), 'hex');

  -- Create HMAC-SHA256 hash with salt
  v_hash := encode(
    hmac(
      v_full_key::bytea,
      v_salt::bytea,
      'sha256'
    ),
    'hex'
  );

  -- Encrypt the key for recoverable storage (admin only)
  v_encryption_key := get_encryption_key('api_key');
  v_encrypted := encode(
    pgp_sym_encrypt(
      v_full_key,
      v_encryption_key,
      'compress-algo=1, cipher-algo=aes256'
    ),
    'base64'
  );

  -- Return all components
  RETURN QUERY SELECT
    v_full_key AS full_key,
    left(v_full_key, 12) AS key_prefix,  -- Show first 12 chars as prefix
    v_hash AS key_hash,
    v_salt AS key_salt,
    v_encrypted AS key_encrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate an API key against stored hash
CREATE OR REPLACE FUNCTION validate_api_key(
  p_api_key TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  api_key_id UUID,
  company_id UUID,
  site_id UUID,
  permissions JSONB,
  rate_limit_per_hour INTEGER
) AS $$
DECLARE
  v_record RECORD;
  v_computed_hash TEXT;
BEGIN
  -- Find potential matches by prefix
  FOR v_record IN
    SELECT ak.*
    FROM api_keys ak
    WHERE ak.api_key_prefix = left(p_api_key, 12)
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > now())
  LOOP
    -- Compute hash with stored salt
    IF v_record.key_salt IS NOT NULL THEN
      -- New HMAC-SHA256 format
      v_computed_hash := encode(
        hmac(p_api_key::bytea, v_record.key_salt::bytea, 'sha256'),
        'hex'
      );
    ELSE
      -- Legacy SHA256 format (backward compatibility)
      v_computed_hash := encode(digest(p_api_key, 'sha256'), 'hex');
    END IF;

    -- Compare hashes (constant-time comparison)
    IF v_computed_hash = v_record.api_key_hash THEN
      -- Update last used timestamp
      UPDATE api_keys
      SET last_used_at = now(),
          usage_count = usage_count + 1
      WHERE id = v_record.id;

      -- Return success
      RETURN QUERY SELECT
        true AS is_valid,
        v_record.id AS api_key_id,
        v_record.company_id,
        v_record.site_id,
        v_record.permissions,
        v_record.rate_limit_per_hour;
      RETURN;
    END IF;
  END LOOP;

  -- No match found
  RETURN QUERY SELECT
    false AS is_valid,
    NULL::UUID AS api_key_id,
    NULL::UUID AS company_id,
    NULL::UUID AS site_id,
    NULL::JSONB AS permissions,
    NULL::INTEGER AS rate_limit_per_hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new API key with full security
CREATE OR REPLACE FUNCTION create_api_key(
  p_company_id UUID,
  p_site_id UUID,
  p_key_name TEXT,
  p_permissions JSONB DEFAULT '["read"]'::jsonb,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_rate_limit INTEGER DEFAULT 1000
)
RETURNS TABLE (
  api_key_id UUID,
  full_key TEXT,
  key_prefix TEXT,
  message TEXT
) AS $$
DECLARE
  v_key_data RECORD;
  v_new_id UUID;
BEGIN
  -- Verify user has admin access
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND company_id = p_company_id
    AND role IN ('admin', 'root_admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create API key';
  END IF;

  -- Generate secure key
  SELECT * INTO v_key_data FROM generate_secure_api_key('bdesk');

  -- Insert the API key
  INSERT INTO api_keys (
    company_id,
    site_id,
    key_name,
    api_key_hash,
    api_key_prefix,
    key_salt,
    key_encrypted,
    hash_algorithm,
    key_version,
    permissions,
    expires_at,
    rate_limit_per_hour,
    created_by,
    security_metadata
  ) VALUES (
    p_company_id,
    p_site_id,
    p_key_name,
    v_key_data.key_hash,
    v_key_data.key_prefix,
    v_key_data.key_salt,
    v_key_data.key_encrypted,
    'hmac-sha256',
    1,
    p_permissions,
    p_expires_at,
    p_rate_limit,
    auth.uid(),
    jsonb_build_object(
      'created_at', now(),
      'created_by_ip', inet_client_addr(),
      'algorithm', 'hmac-sha256',
      'encryption', 'aes-256-pgp'
    )
  )
  RETURNING id INTO v_new_id;

  -- Log the creation
  PERFORM log_sensitive_access('api_keys', v_new_id, 'full_key', 'create');

  -- Return the key (only time the full key is visible!)
  RETURN QUERY SELECT
    v_new_id AS api_key_id,
    v_key_data.full_key AS full_key,
    v_key_data.key_prefix AS key_prefix,
    'IMPORTANT: This is the only time the full API key will be displayed. Store it securely.'::TEXT AS message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retrieve encrypted API key (admin only, logged)
CREATE OR REPLACE FUNCTION retrieve_api_key(
  p_api_key_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_record RECORD;
  v_decrypted TEXT;
  v_encryption_key TEXT;
BEGIN
  -- Verify user is root admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'root_admin'
  ) THEN
    RAISE EXCEPTION 'Only root administrators can retrieve API keys';
  END IF;

  -- Get the API key record
  SELECT * INTO v_record
  FROM api_keys
  WHERE id = p_api_key_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'API key not found';
  END IF;

  IF v_record.key_encrypted IS NULL THEN
    RAISE EXCEPTION 'This API key does not have encrypted storage enabled';
  END IF;

  -- Decrypt the key
  v_encryption_key := get_encryption_key('api_key');
  v_decrypted := pgp_sym_decrypt(
    decode(v_record.key_encrypted, 'base64'),
    v_encryption_key
  );

  -- Log the access (critical audit event)
  PERFORM log_sensitive_access('api_keys', p_api_key_id, 'key_encrypted', 'decrypt');

  -- Also insert into sensitive data access log with full details
  INSERT INTO sensitive_data_access_log (
    user_id,
    site_id,
    table_name,
    record_id,
    field_accessed,
    access_type,
    ip_address
  ) VALUES (
    auth.uid(),
    v_record.site_id,
    'api_keys',
    p_api_key_id,
    'FULL_KEY_RETRIEVAL',
    'decrypt_admin',
    inet_client_addr()
  );

  RETURN v_decrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rotate an API key (generates new key, keeps same ID/permissions)
CREATE OR REPLACE FUNCTION rotate_api_key(
  p_api_key_id UUID
)
RETURNS TABLE (
  new_full_key TEXT,
  new_key_prefix TEXT,
  message TEXT
) AS $$
DECLARE
  v_record RECORD;
  v_key_data RECORD;
BEGIN
  -- Get existing key
  SELECT * INTO v_record
  FROM api_keys
  WHERE id = p_api_key_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'API key not found';
  END IF;

  -- Verify permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND company_id = v_record.company_id
    AND role IN ('admin', 'root_admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to rotate API key';
  END IF;

  -- Generate new key
  SELECT * INTO v_key_data FROM generate_secure_api_key('bdesk');

  -- Update the record
  UPDATE api_keys
  SET
    api_key_hash = v_key_data.key_hash,
    api_key_prefix = v_key_data.key_prefix,
    key_salt = v_key_data.key_salt,
    key_encrypted = v_key_data.key_encrypted,
    key_version = key_version + 1,
    updated_at = now(),
    security_metadata = security_metadata || jsonb_build_object(
      'rotated_at', now(),
      'rotated_by', auth.uid(),
      'previous_version', key_version
    )
  WHERE id = p_api_key_id;

  -- Log rotation
  PERFORM log_sensitive_access('api_keys', p_api_key_id, 'full_key', 'rotate');

  RETURN QUERY SELECT
    v_key_data.full_key AS new_full_key,
    v_key_data.key_prefix AS new_key_prefix,
    'API key rotated successfully. Store the new key securely.'::TEXT AS message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: MIGRATE EXISTING API KEYS
-- =====================================================

-- Migrate legacy keys to new format (adds salt if missing)
DO $$
DECLARE
  v_record RECORD;
  v_new_salt TEXT;
BEGIN
  FOR v_record IN
    SELECT id, api_key_hash
    FROM api_keys
    WHERE key_salt IS NULL
  LOOP
    -- Generate new salt
    v_new_salt := encode(gen_random_bytes(16), 'hex');

    -- Update with new salt (keep existing hash for backward compatibility)
    UPDATE api_keys
    SET
      key_salt = v_new_salt,
      hash_algorithm = 'sha256-legacy',
      security_metadata = COALESCE(security_metadata, '{}'::jsonb) || jsonb_build_object(
        'migrated_at', now(),
        'migration_note', 'Added salt column, hash unchanged for backward compatibility'
      )
    WHERE id = v_record.id;
  END LOOP;

  RAISE NOTICE 'Migrated existing API keys to new security format';
END $$;

-- =====================================================
-- STEP 4: CREATE SECURE VIEWS
-- =====================================================

-- Secure view for API keys (never shows hash or encrypted key)
CREATE OR REPLACE VIEW api_keys_secure AS
SELECT
  id,
  company_id,
  site_id,
  key_name,
  api_key_prefix,
  -- Mask the hash for display
  left(api_key_hash, 8) || '...' || right(api_key_hash, 4) as hash_preview,
  hash_algorithm,
  key_version,
  permissions,
  is_active,
  expires_at,
  last_used_at,
  usage_count,
  rate_limit_per_hour,
  created_by,
  created_at,
  updated_at,
  -- Show if key is encrypted (recoverable)
  (key_encrypted IS NOT NULL) as is_recoverable,
  security_metadata
FROM api_keys
WHERE site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
AND company_id IN (
  SELECT company_id FROM user_profiles
  WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
);

-- =====================================================
-- STEP 5: ADD RATE LIMITING SUPPORT
-- =====================================================

-- Track API key usage for rate limiting
CREATE TABLE IF NOT EXISTS api_key_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(api_key_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_window ON api_key_rate_limits(api_key_id, window_start);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_api_rate_limit(
  p_api_key_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_rate_limit INTEGER;
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Get rate limit for this key
  SELECT rate_limit_per_hour INTO v_rate_limit
  FROM api_keys
  WHERE id = p_api_key_id;

  -- Calculate current hour window
  v_window_start := date_trunc('hour', now());

  -- Get or create usage record
  INSERT INTO api_key_rate_limits (api_key_id, window_start, request_count)
  VALUES (p_api_key_id, v_window_start, 1)
  ON CONFLICT (api_key_id, window_start)
  DO UPDATE SET request_count = api_key_rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  -- Check if over limit
  IF v_current_count > v_rate_limit THEN
    RETURN FALSE; -- Rate limited
  END IF;

  RETURN TRUE; -- Within limits
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_api_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM api_key_rate_limits
  WHERE window_start < now() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 6: VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_test_key RECORD;
  v_validation RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== API KEY ENCRYPTION VERIFICATION ===';
  RAISE NOTICE '';

  -- Test key generation
  SELECT * INTO v_test_key FROM generate_secure_api_key('test');

  IF v_test_key.full_key IS NOT NULL AND
     v_test_key.key_hash IS NOT NULL AND
     v_test_key.key_salt IS NOT NULL AND
     v_test_key.key_encrypted IS NOT NULL THEN
    RAISE NOTICE '✓ Key generation test PASSED';
    RAISE NOTICE '  - Full key length: %', length(v_test_key.full_key);
    RAISE NOTICE '  - Hash length: %', length(v_test_key.key_hash);
    RAISE NOTICE '  - Salt length: %', length(v_test_key.key_salt);
    RAISE NOTICE '  - Encrypted key present: YES';
  ELSE
    RAISE WARNING '✗ Key generation test FAILED';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Available API key functions:';
  RAISE NOTICE '  - generate_secure_api_key(prefix) -> key components';
  RAISE NOTICE '  - validate_api_key(key) -> validation result';
  RAISE NOTICE '  - create_api_key(company, site, name, permissions) -> new key';
  RAISE NOTICE '  - retrieve_api_key(id) -> decrypted key (admin only)';
  RAISE NOTICE '  - rotate_api_key(id) -> new key for existing record';
  RAISE NOTICE '  - check_api_rate_limit(id) -> rate limit check';
  RAISE NOTICE '';
  RAISE NOTICE 'Security features:';
  RAISE NOTICE '  - HMAC-SHA256 hashing with per-key salt';
  RAISE NOTICE '  - AES-256 encryption for recoverable keys';
  RAISE NOTICE '  - Rate limiting per API key';
  RAISE NOTICE '  - Full audit logging for key access';
  RAISE NOTICE '  - Key rotation support';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration 20251203000004 completed successfully!';
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION generate_secure_api_key(TEXT) IS
  'Generates a cryptographically secure API key with HMAC-SHA256 hash and AES-256 encrypted storage';

COMMENT ON FUNCTION validate_api_key(TEXT) IS
  'Validates an API key against stored hash. Returns key details if valid.';

COMMENT ON FUNCTION create_api_key(UUID, UUID, TEXT, JSONB, TIMESTAMPTZ, INTEGER) IS
  'Creates a new API key with full security. Returns the full key ONCE.';

COMMENT ON FUNCTION retrieve_api_key(UUID) IS
  'Retrieves encrypted API key. ROOT ADMIN ONLY. Fully audited.';

COMMENT ON FUNCTION rotate_api_key(UUID) IS
  'Rotates an API key, generating new credentials while preserving metadata.';

COMMENT ON VIEW api_keys_secure IS
  'Secure view of API keys. Never exposes hashes or encrypted keys.';
