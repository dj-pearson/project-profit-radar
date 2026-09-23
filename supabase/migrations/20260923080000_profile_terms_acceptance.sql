-- Record Terms and Privacy acceptance at signup (US-361).
--
-- The signup form said "By signing up, you agree" with no link and no
-- checkbox, and nothing stored that anyone agreed to anything. The form now
-- requires the box, and signup-with-otp writes when and which version.
-- Both nullable: existing accounts have no recorded acceptance, and a NULL
-- says exactly that.

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS terms_version text;

COMMENT ON COLUMN public.user_profiles.terms_accepted_at IS 'When the user ticked the Terms/Privacy box at signup (US-361). NULL: no recorded acceptance.';
COMMENT ON COLUMN public.user_profiles.terms_version IS 'LEGAL_TERMS_VERSION (src/lib/legal/termsVersion.ts) the user accepted.';
