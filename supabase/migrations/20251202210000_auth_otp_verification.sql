-- Auth OTP Tokens Table
-- Stores OTP codes for email verification, password reset, etc.
-- Supports multi-tenant architecture with site_id

-- Create auth_otp_codes table
CREATE TABLE IF NOT EXISTS public.auth_otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    token_type TEXT NOT NULL CHECK (token_type IN (
        'confirm_signup',
        'invite_user',
        'magic_link',
        'change_email',
        'reset_password',
        'reauthentication'
    )),
    -- For change_email, stores the new email address
    new_email TEXT,
    -- For invite_user, stores the inviter info
    inviter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    inviter_name TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    -- Metadata
    metadata JSONB DEFAULT '{}',
    -- Tracking
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- IP and user agent for security auditing
    created_ip TEXT,
    created_user_agent TEXT
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_site_id ON public.auth_otp_codes(site_id);
CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_email ON public.auth_otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_lookup ON public.auth_otp_codes(site_id, email, token_type, is_used, expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_code ON public.auth_otp_codes(otp_code, is_used);
CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_cleanup ON public.auth_otp_codes(expires_at) WHERE is_used = FALSE;

-- RLS Policies
ALTER TABLE public.auth_otp_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role has full access to auth_otp_codes" ON public.auth_otp_codes;

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access to auth_otp_codes"
    ON public.auth_otp_codes
    FOR ALL
    TO service_role
    USING (true);

-- Users cannot directly access OTP tokens (only through edge functions)
-- This prevents enumeration attacks

-- Function to clean up expired OTP tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.auth_otp_codes
    WHERE expires_at < NOW()
    OR (is_used = TRUE AND used_at < NOW() - INTERVAL '24 hours');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- Function to verify OTP code
CREATE OR REPLACE FUNCTION public.verify_otp_code(
    p_site_id UUID,
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
AS $$
DECLARE
    v_token RECORD;
BEGIN
    -- Find valid token
    SELECT * INTO v_token
    FROM public.auth_otp_codes t
    WHERE t.site_id = p_site_id
      AND LOWER(t.email) = LOWER(p_email)
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
        WHERE site_id = p_site_id
          AND LOWER(email) = LOWER(p_email)
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
    WHERE site_id = p_site_id
      AND LOWER(email) = LOWER(p_email)
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

-- Function to create OTP token
CREATE OR REPLACE FUNCTION public.create_otp_token(
    p_site_id UUID,
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
AS $$
DECLARE
    v_token_id UUID;
BEGIN
    -- Invalidate existing unused tokens of same type for this email
    UPDATE public.auth_otp_codes
    SET is_used = TRUE, used_at = NOW()
    WHERE site_id = p_site_id
      AND LOWER(email) = LOWER(p_email)
      AND token_type = p_token_type
      AND is_used = FALSE;

    -- Create new token
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
        p_site_id,
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
GRANT EXECUTE ON FUNCTION public.cleanup_expired_otp_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_otp_code(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_otp_token(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, UUID, TEXT, UUID, JSONB, TEXT, TEXT) TO service_role;

-- Add comment
COMMENT ON TABLE public.auth_otp_codes IS 'Stores OTP verification codes for authentication flows. Supports multi-tenant architecture with site_id isolation.';
