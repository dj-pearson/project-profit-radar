-- Fix OTP functions for single-tenant architecture
-- The edge functions call these without site_id, but the original functions require it
-- This migration creates single-tenant versions that work without site_id

-- First, make site_id nullable on auth_otp_codes table
-- (We keep the column for backwards compatibility but don't require it)
DO $$
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'auth_otp_codes_site_id_fkey'
        AND table_name = 'auth_otp_codes'
    ) THEN
        ALTER TABLE public.auth_otp_codes DROP CONSTRAINT auth_otp_codes_site_id_fkey;
    END IF;

    -- Make site_id nullable
    ALTER TABLE public.auth_otp_codes ALTER COLUMN site_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error modifying auth_otp_codes: %', SQLERRM;
END $$;

-- Create single-tenant version of verify_otp_code (without site_id parameter)
CREATE OR REPLACE FUNCTION public.verify_otp_code(
    p_email TEXT,
    p_otp_code TEXT,
    p_token_type TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    token_id UUID,
    new_email TEXT,
    inviter_user_id UUID,
    inviter_name TEXT,
    company_id UUID,
    metadata JSONB,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token RECORD;
BEGIN
    -- Find valid token (ignore site_id for single-tenant)
    SELECT * INTO v_token
    FROM public.auth_otp_codes t
    WHERE LOWER(t.email) = LOWER(p_email)
      AND t.otp_code = p_otp_code
      AND t.token_type = p_token_type
      AND t.is_used = FALSE
      AND t.expires_at > NOW()
    ORDER BY t.created_at DESC
    LIMIT 1
    FOR UPDATE;

    -- No valid token found
    IF NOT FOUND THEN
        -- Check if there's an unused token with wrong code (to increment attempts)
        UPDATE public.auth_otp_codes
        SET attempts = attempts + 1
        WHERE LOWER(email) = LOWER(p_email)
          AND token_type = p_token_type
          AND is_used = FALSE
          AND expires_at > NOW()
          AND otp_code != p_otp_code;

        RETURN QUERY SELECT
            FALSE::BOOLEAN,
            NULL::UUID,
            NULL::TEXT,
            NULL::UUID,
            NULL::TEXT,
            NULL::UUID,
            NULL::JSONB,
            'Invalid or expired verification code'::TEXT;
        RETURN;
    END IF;

    -- Check max attempts
    IF v_token.attempts >= v_token.max_attempts THEN
        -- Mark as used to prevent further attempts
        UPDATE public.auth_otp_codes
        SET is_used = TRUE, used_at = NOW()
        WHERE id = v_token.id;

        RETURN QUERY SELECT
            FALSE::BOOLEAN,
            NULL::UUID,
            NULL::TEXT,
            NULL::UUID,
            NULL::TEXT,
            NULL::UUID,
            NULL::JSONB,
            'Maximum verification attempts exceeded. Please request a new code.'::TEXT;
        RETURN;
    END IF;

    -- Mark token as used
    UPDATE public.auth_otp_codes
    SET is_used = TRUE,
        used_at = NOW(),
        attempts = attempts + 1
    WHERE id = v_token.id;

    -- Invalidate other tokens of same type for this email
    UPDATE public.auth_otp_codes
    SET is_used = TRUE, used_at = NOW()
    WHERE LOWER(email) = LOWER(p_email)
      AND token_type = p_token_type
      AND id != v_token.id
      AND is_used = FALSE;

    -- Return success
    RETURN QUERY SELECT
        TRUE::BOOLEAN,
        v_token.id,
        v_token.new_email,
        v_token.inviter_user_id,
        v_token.inviter_name,
        v_token.company_id,
        v_token.metadata,
        NULL::TEXT;
END;
$$;

-- Create single-tenant version of create_otp_token (without site_id parameter)
CREATE OR REPLACE FUNCTION public.create_otp_token(
    p_email TEXT,
    p_otp_code TEXT,
    p_token_type TEXT,
    p_expires_in_minutes INTEGER DEFAULT 15,
    p_new_email TEXT DEFAULT NULL,
    p_inviter_user_id UUID DEFAULT NULL,
    p_inviter_name TEXT DEFAULT NULL,
    p_company_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_id UUID;
BEGIN
    -- Invalidate existing unused tokens of same type for this email
    UPDATE public.auth_otp_codes
    SET is_used = TRUE, used_at = NOW()
    WHERE LOWER(email) = LOWER(p_email)
      AND token_type = p_token_type
      AND is_used = FALSE;

    -- Create new token (site_id can be null for single-tenant)
    INSERT INTO public.auth_otp_codes (
        site_id,
        email,
        otp_code,
        token_type,
        new_email,
        inviter_user_id,
        inviter_name,
        company_id,
        metadata,
        expires_at,
        created_ip,
        created_user_agent
    ) VALUES (
        NULL,  -- No site_id for single-tenant
        LOWER(p_email),
        p_otp_code,
        p_token_type,
        LOWER(p_new_email),
        p_inviter_user_id,
        p_inviter_name,
        p_company_id,
        p_metadata,
        NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL,
        p_ip,
        p_user_agent
    )
    RETURNING id INTO v_token_id;

    RETURN v_token_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.verify_otp_code(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_otp_code(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_otp_token(TEXT, TEXT, TEXT, INTEGER, TEXT, UUID, TEXT, UUID, JSONB, TEXT, TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.verify_otp_code(TEXT, TEXT, TEXT) IS 'Single-tenant version: Verifies OTP code for authentication flows';
COMMENT ON FUNCTION public.create_otp_token(TEXT, TEXT, TEXT, INTEGER, TEXT, UUID, TEXT, UUID, JSONB, TEXT, TEXT) IS 'Single-tenant version: Creates OTP token for authentication flows';
