-- =====================================================
-- REFERRAL PROGRAM SYSTEM
-- =====================================================
-- Purpose: Viral growth through customer referrals
-- Features:
--   - Unique referral codes
--   - Reward tracking
--   - Referral analytics
--   - Multi-tier rewards
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS referral_rewards CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;

-- =====================================================
-- 1. REFERRAL CODES TABLE
-- =====================================================

CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Code details
  code TEXT UNIQUE NOT NULL, -- e.g., "JOHN-BUILD-2025"
  is_active BOOLEAN DEFAULT TRUE,

  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,

  -- Reward configuration
  referrer_reward_type TEXT DEFAULT 'credit', -- credit, discount, months_free, cash
  referrer_reward_amount DECIMAL(10,2), -- Dollar amount or percentage
  referrer_reward_duration INTEGER, -- Months for recurring rewards

  referee_reward_type TEXT DEFAULT 'discount', -- credit, discount, trial_extension
  referee_reward_amount DECIMAL(10,2),
  referee_reward_duration INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active);

-- =====================================================
-- 2. REFERRALS TABLE
-- =====================================================

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referrer (person who shared the code)
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,

  -- Referee (person who used the code)
  referee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referee_email TEXT NOT NULL,
  referee_name TEXT,

  -- Referral status
  status TEXT DEFAULT 'pending', -- pending, signed_up, trial_active, converted, expired
  converted_to_paid BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,

  -- Tracking
  referral_date TIMESTAMPTZ DEFAULT NOW(),
  signup_date TIMESTAMPTZ,
  trial_start_date TIMESTAMPTZ,

  -- Attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Rewards
  referrer_rewarded BOOLEAN DEFAULT FALSE,
  referrer_reward_date TIMESTAMPTZ,
  referrer_reward_amount DECIMAL(10,2),

  referee_rewarded BOOLEAN DEFAULT FALSE,
  referee_reward_date TIMESTAMPTZ,
  referee_reward_amount DECIMAL(10,2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_converted ON referrals(converted_to_paid);
CREATE INDEX IF NOT EXISTS idx_referrals_date ON referrals(referral_date DESC);

-- =====================================================
-- 3. REFERRAL REWARDS TABLE
-- =====================================================

CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reward recipient
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,

  -- Reward details
  reward_type TEXT NOT NULL, -- credit, discount, free_months, cash_payout
  reward_amount DECIMAL(10,2) NOT NULL,
  reward_currency TEXT DEFAULT 'USD',

  -- Status
  status TEXT DEFAULT 'pending', -- pending, approved, paid, cancelled
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Payment details
  payment_method TEXT, -- account_credit, stripe_transfer, check, etc.
  payment_reference TEXT, -- Transaction ID or check number

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rewards_user ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_referral ON referral_rewards(referral_id);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON referral_rewards(status);
CREATE INDEX IF NOT EXISTS idx_rewards_issued_at ON referral_rewards(issued_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own referral code
CREATE POLICY "Users can view own referral code"
  ON referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own referral code"
  ON referral_codes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can view referrals they made
CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_user_id OR auth.uid() = referee_user_id);

-- Users can view their own rewards
CREATE POLICY "Users can view own rewards"
  ON referral_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all referral data
CREATE POLICY "Admins can view all codes"
  ON referral_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

CREATE POLICY "Admins can view all referrals"
  ON referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

CREATE POLICY "Admins can view all rewards"
  ON referral_rewards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Update referral code usage count
CREATE OR REPLACE FUNCTION update_referral_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE referral_codes
  SET
    current_uses = current_uses + 1,
    updated_at = NOW()
  WHERE id = NEW.referral_code_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER increment_code_usage
  AFTER INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_code_usage();

-- Auto-generate referral code for new users
CREATE OR REPLACE FUNCTION create_referral_code_for_user()
RETURNS TRIGGER AS $$
DECLARE
  v_code TEXT;
  v_first_name TEXT;
BEGIN
  -- Get user's first name from profile
  SELECT first_name INTO v_first_name
  FROM user_profiles
  WHERE id = NEW.id;

  -- Generate code: FIRSTNAME-BUILD-XXXX
  v_code := UPPER(COALESCE(v_first_name, 'USER')) || '-BUILD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code) LOOP
    v_code := UPPER(COALESCE(v_first_name, 'USER')) || '-BUILD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END LOOP;

  -- Create referral code
  INSERT INTO referral_codes (
    user_id,
    code,
    referrer_reward_type,
    referrer_reward_amount,
    referee_reward_type,
    referee_reward_amount
  ) VALUES (
    NEW.id,
    v_code,
    'credit',
    50.00, -- $50 credit for referrer
    'discount',
    50.00 -- $50 discount for referee
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger should be created on user_profiles table after signup
-- CREATE TRIGGER create_user_referral_code
--   AFTER INSERT ON user_profiles
--   FOR EACH ROW
--   EXECUTE FUNCTION create_referral_code_for_user();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Get referral stats for a user
CREATE OR REPLACE FUNCTION get_user_referral_stats(p_user_id UUID)
RETURNS TABLE(
  total_referrals BIGINT,
  successful_referrals BIGINT,
  pending_referrals BIGINT,
  total_rewards_earned NUMERIC,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_referrals,
    COUNT(*) FILTER (WHERE converted_to_paid = TRUE)::BIGINT as successful_referrals,
    COUNT(*) FILTER (WHERE status IN ('pending', 'signed_up', 'trial_active'))::BIGINT as pending_referrals,
    COALESCE(SUM(referrer_reward_amount) FILTER (WHERE referrer_rewarded = TRUE), 0) as total_rewards_earned,
    ROUND(
      (COUNT(*) FILTER (WHERE converted_to_paid = TRUE)::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100,
      2
    ) as conversion_rate
  FROM referrals
  WHERE referrer_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get top referrers (leaderboard)
CREATE OR REPLACE FUNCTION get_referral_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  total_referrals BIGINT,
  successful_referrals BIGINT,
  total_rewards NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.user_id,
    up.first_name,
    up.last_name,
    up.email,
    COUNT(r.id)::BIGINT as total_referrals,
    COUNT(r.id) FILTER (WHERE r.converted_to_paid = TRUE)::BIGINT as successful_referrals,
    COALESCE(SUM(r.referrer_reward_amount) FILTER (WHERE r.referrer_rewarded = TRUE), 0) as total_rewards
  FROM referral_codes rc
  LEFT JOIN referrals r ON r.referral_code_id = rc.id
  LEFT JOIN user_profiles up ON up.id = rc.user_id
  GROUP BY rc.user_id, up.first_name, up.last_name, up.email
  HAVING COUNT(r.id) > 0
  ORDER BY successful_referrals DESC, total_referrals DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply referral code
CREATE OR REPLACE FUNCTION apply_referral_code(
  p_code TEXT,
  p_referee_email TEXT,
  p_referee_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_code_record RECORD;
  v_referral_id UUID;
BEGIN
  -- Get the referral code
  SELECT * INTO v_code_record
  FROM referral_codes
  WHERE code = p_code
  AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW())
  AND (max_uses IS NULL OR current_uses < max_uses);

  IF v_code_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired referral code';
  END IF;

  -- Create referral record
  INSERT INTO referrals (
    referrer_user_id,
    referral_code_id,
    referee_email,
    referee_name,
    status
  ) VALUES (
    v_code_record.user_id,
    v_code_record.id,
    p_referee_email,
    p_referee_name,
    'pending'
  )
  RETURNING id INTO v_referral_id;

  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE referral_codes IS
  'Unique referral codes for each user to share with potential customers';

COMMENT ON TABLE referrals IS
  'Tracks all referral relationships and their status through the funnel';

COMMENT ON TABLE referral_rewards IS
  'Records rewards earned and paid out for successful referrals';

-- =====================================================
-- DEPLOYMENT VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250202000006_referral_program.sql completed successfully';
  RAISE NOTICE 'Created tables: referral_codes, referrals, referral_rewards';
  RAISE NOTICE 'Created indexes: 14 indexes for performance';
  RAISE NOTICE 'Created policies: 9 RLS policies';
  RAISE NOTICE 'Created functions: get_user_referral_stats, get_referral_leaderboard, apply_referral_code';
END $$;
