-- Profitability Calculator Lead Capture System
-- This migration creates tables for tracking leads from the free calculator tool

-- Table: calculator_leads
-- Stores lead information captured from the profitability calculator
CREATE TABLE IF NOT EXISTS calculator_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- Lead status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'nurturing', 'qualified', 'trial', 'converted', 'lost')),
  lead_score INTEGER DEFAULT 0,

  -- Conversion tracking
  trial_started_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  converted_to_company_id UUID REFERENCES companies(id),

  -- Referral tracking
  referred_by_email TEXT,
  referral_count INTEGER DEFAULT 0,

  UNIQUE(email)
);

-- Table: calculator_sessions
-- Tracks each calculation session for analytics
CREATE TABLE IF NOT EXISTS calculator_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES calculator_leads(id),
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Session metadata
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,

  -- UTM parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Engagement metrics
  time_on_page INTEGER, -- seconds
  calculations_performed INTEGER DEFAULT 0,
  email_captured BOOLEAN DEFAULT FALSE,
  pdf_downloaded BOOLEAN DEFAULT FALSE,
  social_shared BOOLEAN DEFAULT FALSE,
  trial_clicked BOOLEAN DEFAULT FALSE,

  -- Device info
  device_type TEXT, -- mobile, tablet, desktop
  browser TEXT,
  os TEXT
);

-- Table: calculator_calculations
-- Stores each calculation for analytics and remarketing
CREATE TABLE IF NOT EXISTS calculator_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES calculator_sessions(id),
  lead_id UUID REFERENCES calculator_leads(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Input values
  project_type TEXT NOT NULL,
  labor_hours NUMERIC(10,2) NOT NULL,
  material_cost NUMERIC(10,2) NOT NULL,
  crew_size INTEGER NOT NULL,
  project_duration INTEGER NOT NULL, -- days

  -- Calculated results
  recommended_bid NUMERIC(10,2),
  profit_margin NUMERIC(5,2),
  hourly_rate NUMERIC(10,2),
  break_even_amount NUMERIC(10,2),
  risk_score INTEGER,

  -- Comparison data
  saved_for_comparison BOOLEAN DEFAULT FALSE
);

-- Table: calculator_email_events
-- Tracks email engagement for nurture sequence
CREATE TABLE IF NOT EXISTS calculator_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES calculator_leads(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  email_type TEXT NOT NULL, -- welcome, day1, day2, etc.
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed')),

  -- Email metadata
  subject TEXT,
  link_clicked TEXT,
  email_provider TEXT -- resend, sendgrid, etc.
);

-- Table: calculator_referrals
-- Tracks referral program
CREATE TABLE IF NOT EXISTS calculator_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_email TEXT NOT NULL,
  referee_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Referral status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  completed_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,

  -- Reward info
  reward_type TEXT, -- template, feature, discount
  reward_delivered BOOLEAN DEFAULT FALSE,

  UNIQUE(referrer_email, referee_email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calculator_leads_email ON calculator_leads(email);
CREATE INDEX IF NOT EXISTS idx_calculator_leads_status ON calculator_leads(status);
CREATE INDEX IF NOT EXISTS idx_calculator_leads_created_at ON calculator_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calculator_sessions_lead_id ON calculator_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_calculator_sessions_session_id ON calculator_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_calculator_calculations_session_id ON calculator_calculations(session_id);
CREATE INDEX IF NOT EXISTS idx_calculator_calculations_lead_id ON calculator_calculations(lead_id);
CREATE INDEX IF NOT EXISTS idx_calculator_email_events_lead_id ON calculator_email_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_calculator_referrals_referrer ON calculator_referrals(referrer_email);
CREATE INDEX IF NOT EXISTS idx_calculator_referrals_referee ON calculator_referrals(referee_email);

-- RLS Policies
-- Calculator leads are public for insertion but private for reading
ALTER TABLE calculator_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_referrals ENABLE ROW LEVEL SECURITY;

-- Allow public to insert leads (for calculator form)
CREATE POLICY "Allow public to insert leads" ON calculator_leads
  FOR INSERT TO anon WITH CHECK (true);

-- Allow public to insert sessions
CREATE POLICY "Allow public to insert sessions" ON calculator_sessions
  FOR INSERT TO anon WITH CHECK (true);

-- Allow public to insert calculations
CREATE POLICY "Allow public to insert calculations" ON calculator_calculations
  FOR INSERT TO anon WITH CHECK (true);

-- Allow public to insert referrals
CREATE POLICY "Allow public to insert referrals" ON calculator_referrals
  FOR INSERT TO anon WITH CHECK (true);

-- Only admin/root_admin can read leads
CREATE POLICY "Only admins can read leads" ON calculator_leads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'root_admin')
    )
  );

-- Only admin/root_admin can update leads
CREATE POLICY "Only admins can update leads" ON calculator_leads
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'root_admin')
    )
  );

-- Functions for analytics

-- Function: Get calculator conversion funnel
CREATE OR REPLACE FUNCTION get_calculator_funnel_metrics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  total_sessions BIGINT,
  calculations_performed BIGINT,
  emails_captured BIGINT,
  pdfs_downloaded BIGINT,
  trials_clicked BIGINT,
  trials_started BIGINT,
  conversions BIGINT,
  email_capture_rate NUMERIC,
  pdf_download_rate NUMERIC,
  trial_click_rate NUMERIC,
  trial_start_rate NUMERIC,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH metrics AS (
    SELECT
      COUNT(DISTINCT cs.id) as total_sess,
      COUNT(DISTINCT CASE WHEN cs.calculations_performed > 0 THEN cs.id END) as calcs,
      COUNT(DISTINCT CASE WHEN cs.email_captured THEN cs.id END) as emails,
      COUNT(DISTINCT CASE WHEN cs.pdf_downloaded THEN cs.id END) as pdfs,
      COUNT(DISTINCT CASE WHEN cs.trial_clicked THEN cs.id END) as trials_click,
      COUNT(DISTINCT cl.trial_started_at) as trials_start,
      COUNT(DISTINCT cl.converted_at) as convs
    FROM calculator_sessions cs
    LEFT JOIN calculator_leads cl ON cl.id = cs.lead_id
    WHERE cs.created_at BETWEEN start_date AND end_date
  )
  SELECT
    total_sess,
    calcs,
    emails,
    pdfs,
    trials_click,
    trials_start,
    convs,
    CASE WHEN total_sess > 0 THEN ROUND((emails::NUMERIC / total_sess) * 100, 2) ELSE 0 END,
    CASE WHEN emails > 0 THEN ROUND((pdfs::NUMERIC / emails) * 100, 2) ELSE 0 END,
    CASE WHEN emails > 0 THEN ROUND((trials_click::NUMERIC / emails) * 100, 2) ELSE 0 END,
    CASE WHEN trials_click > 0 THEN ROUND((trials_start::NUMERIC / trials_click) * 100, 2) ELSE 0 END,
    CASE WHEN trials_start > 0 THEN ROUND((convs::NUMERIC / trials_start) * 100, 2) ELSE 0 END
  FROM metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get top performing project types
CREATE OR REPLACE FUNCTION get_calculator_project_type_stats()
RETURNS TABLE(
  project_type TEXT,
  calculation_count BIGINT,
  avg_profit_margin NUMERIC,
  avg_bid_amount NUMERIC,
  email_capture_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.project_type,
    COUNT(cc.id) as calc_count,
    ROUND(AVG(cc.profit_margin), 2) as avg_margin,
    ROUND(AVG(cc.recommended_bid), 2) as avg_bid,
    ROUND(
      (COUNT(DISTINCT CASE WHEN cs.email_captured THEN cs.id END)::NUMERIC /
       COUNT(DISTINCT cs.id)) * 100,
      2
    ) as capture_rate
  FROM calculator_calculations cc
  LEFT JOIN calculator_sessions cs ON cs.id = cc.session_id
  GROUP BY cc.project_type
  ORDER BY calc_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_calculator_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculator_leads_updated_at
  BEFORE UPDATE ON calculator_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_calculator_leads_updated_at();

-- Comment documentation
COMMENT ON TABLE calculator_leads IS 'Stores lead information captured from the profitability calculator tool';
COMMENT ON TABLE calculator_sessions IS 'Tracks each visitor session for analytics and conversion optimization';
COMMENT ON TABLE calculator_calculations IS 'Stores each calculation performed for analytics and remarketing';
COMMENT ON TABLE calculator_email_events IS 'Tracks email engagement for the nurture sequence';
COMMENT ON TABLE calculator_referrals IS 'Manages the referral program for viral growth';
