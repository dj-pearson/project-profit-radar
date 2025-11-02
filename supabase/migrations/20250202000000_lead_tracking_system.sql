-- Lead Tracking System
-- Creates tables for capturing and tracking leads before signup

-- Drop existing tables if they exist (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS lead_activities CASCADE;
DROP TABLE IF EXISTS demo_requests CASCADE;
DROP TABLE IF EXISTS sales_contact_requests CASCADE;
DROP TABLE IF EXISTS leads CASCADE;

-- Leads table for pre-signup captures
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact information
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  phone TEXT,

  -- Company details
  company_size TEXT, -- '1-10', '11-50', '51-200', '201-500', '500+'
  industry TEXT, -- 'residential', 'commercial', 'industrial', 'specialty_trades'
  annual_revenue TEXT, -- '<1M', '1M-5M', '5M-10M', '10M-50M', '50M+'

  -- Lead source tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  landing_page TEXT,
  referrer TEXT,

  -- Lead qualification
  lead_status TEXT DEFAULT 'new', -- new, contacted, qualified, demo_scheduled, converted, lost
  lead_score INTEGER DEFAULT 0,
  lead_source TEXT, -- website, referral, social_media, advertising, cold_outreach
  priority TEXT DEFAULT 'medium', -- low, medium, high, hot

  -- Interest signals
  interest_type TEXT, -- trial, demo, sales_contact, just_browsing
  requested_demo BOOLEAN DEFAULT false,
  demo_scheduled_at TIMESTAMPTZ,
  requested_sales_contact BOOLEAN DEFAULT false,
  downloaded_resource BOOLEAN DEFAULT false,
  viewed_pricing BOOLEAN DEFAULT false,
  started_signup BOOLEAN DEFAULT false,

  -- Notes and tags
  notes TEXT,
  tags TEXT[],

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,

  -- Conversion tracking
  converted_to_user_id UUID REFERENCES auth.users(id),
  converted_at TIMESTAMPTZ,
  conversion_value DECIMAL(10,2),

  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);

-- Lead activities for detailed tracking
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL, -- page_view, form_submit, email_open, email_click, demo_request, etc.
  activity_data JSONB,
  page_url TEXT,

  -- Context
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- Demo requests tracking
CREATE TABLE demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),

  -- Contact info (denormalized for convenience)
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT,

  -- Request details
  demo_type TEXT DEFAULT 'standard', -- quick_15min, standard_30min, full_60min
  preferred_date DATE,
  preferred_time TEXT,
  timezone TEXT,
  message TEXT,

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  calendar_event_id TEXT, -- Calendly or Cal.com event ID
  meeting_url TEXT,

  -- Status
  status TEXT DEFAULT 'requested', -- requested, scheduled, completed, cancelled, no_show
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Follow-up
  follow_up_sent BOOLEAN DEFAULT false,
  follow_up_sent_at TIMESTAMPTZ,
  converted_to_paid BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,

  -- Assignment
  assigned_sales_rep UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_demo_requests_lead_id ON demo_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests(email);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_scheduled_at ON demo_requests(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON demo_requests(created_at DESC);

-- Contact sales requests
CREATE TABLE sales_contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),

  -- Contact info
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT,

  -- Request details
  inquiry_type TEXT, -- pricing, enterprise, partnership, general
  message TEXT NOT NULL,
  estimated_budget TEXT,
  timeline TEXT, -- immediate, 1-3_months, 3-6_months, 6-12_months, planning

  -- Status
  status TEXT DEFAULT 'new', -- new, contacted, in_progress, qualified, converted, closed
  contacted_at TIMESTAMPTZ,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,

  -- Follow-up notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_contacts_lead_id ON sales_contact_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_contacts_email ON sales_contact_requests(email);
CREATE INDEX IF NOT EXISTS idx_sales_contacts_status ON sales_contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_sales_contacts_assigned_to ON sales_contact_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_contacts_created_at ON sales_contact_requests(created_at DESC);

-- Function to update lead score based on activities
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update lead score based on activity type
  UPDATE leads
  SET
    lead_score = CASE
      WHEN NEW.activity_type = 'demo_request' THEN lead_score + 50
      WHEN NEW.activity_type = 'pricing_viewed' THEN lead_score + 20
      WHEN NEW.activity_type = 'signup_started' THEN lead_score + 30
      WHEN NEW.activity_type = 'resource_downloaded' THEN lead_score + 15
      WHEN NEW.activity_type = 'email_opened' THEN lead_score + 5
      WHEN NEW.activity_type = 'email_clicked' THEN lead_score + 10
      WHEN NEW.activity_type = 'page_view' THEN lead_score + 1
      ELSE lead_score
    END,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.lead_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update lead score
CREATE TRIGGER trigger_update_lead_score
  AFTER INSERT ON lead_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_score();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demo_requests_updated_at BEFORE UPDATE ON demo_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_contact_requests_updated_at BEFORE UPDATE ON sales_contact_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_contact_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin and sales team can see all, others can only see their own
CREATE POLICY "Admin and sales can view all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin', 'office_staff')
    )
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Admin and sales can manage leads"
  ON leads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin', 'office_staff')
    )
  );

-- Lead activities visible to those who can see the lead
CREATE POLICY "View lead activities"
  ON lead_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_activities.lead_id
      AND (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('root_admin', 'admin', 'office_staff')
        )
        OR leads.assigned_to = auth.uid()
      )
    )
  );

CREATE POLICY "Insert lead activities"
  ON lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Demo requests - similar policies
CREATE POLICY "View demo requests"
  ON demo_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin', 'office_staff')
    )
    OR assigned_sales_rep = auth.uid()
  );

CREATE POLICY "Manage demo requests"
  ON demo_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin', 'office_staff')
    )
  );

-- Sales contact requests - similar policies
CREATE POLICY "View sales contacts"
  ON sales_contact_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin', 'office_staff')
    )
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Manage sales contacts"
  ON sales_contact_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin', 'office_staff')
    )
  );

-- Allow anonymous users to create leads (for public forms)
CREATE POLICY "Anyone can create leads"
  ON leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can create demo requests"
  ON demo_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can create sales contacts"
  ON sales_contact_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
