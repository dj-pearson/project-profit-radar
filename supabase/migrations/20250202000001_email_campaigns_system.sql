-- Email Campaigns System
-- Creates tables for email marketing automation and nurture sequences

-- Drop existing tables if they exist (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS email_clicks CASCADE;
DROP TABLE IF EXISTS email_queue CASCADE;
DROP TABLE IF EXISTS email_sends CASCADE;
DROP TABLE IF EXISTS email_unsubscribes CASCADE;
DROP TABLE IF EXISTS email_preferences CASCADE;
DROP TABLE IF EXISTS email_campaigns CASCADE;

-- Email campaign definitions
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign identification
  campaign_name TEXT UNIQUE NOT NULL,
  campaign_description TEXT,
  campaign_type TEXT NOT NULL, -- onboarding, trial_nurture, promotional, transactional, reengagement

  -- Trigger configuration
  trigger_type TEXT NOT NULL, -- manual, scheduled, behavioral, lifecycle
  trigger_conditions JSONB, -- conditions that trigger the email
  trigger_event TEXT, -- event name for behavioral triggers

  -- Email configuration
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  from_name TEXT DEFAULT 'BuildDesk Team',
  from_email TEXT DEFAULT 'hello@build-desk.com',
  reply_to TEXT DEFAULT 'support@build-desk.com',

  -- Content
  html_content TEXT,
  text_content TEXT,
  template_id TEXT, -- external template service ID
  template_variables JSONB, -- variables for template personalization

  -- Scheduling
  send_delay_minutes INTEGER DEFAULT 0, -- delay after trigger
  send_at_time TIME, -- specific time of day (e.g., 10:00:00)
  send_on_days INTEGER[], -- days of week (0=Sunday, 6=Saturday)

  -- Sequence information
  sequence_name TEXT, -- group related emails into sequences
  sequence_order INTEGER, -- order within sequence

  -- A/B testing
  ab_test_enabled BOOLEAN DEFAULT false,
  ab_test_variant TEXT, -- A, B, C, etc.
  ab_test_traffic_percentage INTEGER DEFAULT 100,

  -- Status and metrics
  is_active BOOLEAN DEFAULT true,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_complained INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_name ON email_campaigns(campaign_name);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sequence ON email_campaigns(sequence_name, sequence_order);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_active ON email_campaigns(is_active);

-- Email sends tracking
CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign reference
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,

  -- Recipient
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,

  -- Send details
  subject TEXT NOT NULL,
  from_email TEXT,

  -- External provider
  email_provider TEXT, -- sendgrid, postmark, resend, etc.
  email_provider_id TEXT, -- provider's message ID
  email_provider_data JSONB, -- additional provider data

  -- Status
  status TEXT DEFAULT 'pending', -- pending, queued, sent, delivered, bounced, failed, dropped

  -- Engagement tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  last_opened_at TIMESTAMPTZ,

  clicked_at TIMESTAMPTZ,
  first_clicked_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  links_clicked TEXT[], -- array of URLs clicked

  -- Negative events
  unsubscribed_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_type TEXT, -- hard, soft
  bounce_reason TEXT,
  complained_at TIMESTAMPTZ, -- spam complaint

  -- Error handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- Metadata
  send_metadata JSONB, -- custom data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_user ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_email ON email_sends(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_sent_at ON email_sends(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sends_provider_id ON email_sends(email_provider_id);

-- Email queue for scheduled sends
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign reference
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,

  -- Recipient
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)

  -- Status
  status TEXT DEFAULT 'pending', -- pending, processing, sent, failed, cancelled
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,

  -- Reference to send record once processed
  email_send_id UUID REFERENCES email_sends(id),

  -- Metadata
  queue_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_user ON email_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority, scheduled_for);

-- Email click tracking
CREATE TABLE email_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id UUID REFERENCES email_sends(id) ON DELETE CASCADE,

  -- Click details
  url TEXT NOT NULL,
  link_text TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),

  -- Context
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT, -- desktop, mobile, tablet

  -- Tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_clicks_send ON email_clicks(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_clicks_url ON email_clicks(url);
CREATE INDEX IF NOT EXISTS idx_email_clicks_clicked_at ON email_clicks(clicked_at DESC);

-- Email unsubscribes
CREATE TABLE email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,

  -- Unsubscribe details
  unsubscribe_type TEXT, -- all, promotional, newsletter, transactional_optional
  reason TEXT, -- too_frequent, not_relevant, never_signed_up, other
  reason_detail TEXT,

  -- Source
  unsubscribed_from_email_id UUID REFERENCES email_sends(id),
  unsubscribed_via TEXT, -- link, preference_center, complaint

  -- Status
  is_active BOOLEAN DEFAULT true, -- can be re-subscribed
  resubscribed_at TIMESTAMPTZ,

  -- Timestamps
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user ON email_unsubscribes(user_id);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_active ON email_unsubscribes(is_active);

-- Email preferences
CREATE TABLE email_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription preferences
  marketing_emails BOOLEAN DEFAULT true,
  product_updates BOOLEAN DEFAULT true,
  newsletter BOOLEAN DEFAULT true,
  trial_nurture BOOLEAN DEFAULT true,
  billing_notifications BOOLEAN DEFAULT true,

  -- Frequency preferences
  email_frequency TEXT DEFAULT 'normal', -- high, normal, low
  digest_enabled BOOLEAN DEFAULT false,
  digest_frequency TEXT DEFAULT 'weekly', -- daily, weekly, monthly

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'America/New_York',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update campaign stats when email status changes
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign statistics
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    UPDATE email_campaigns SET total_sent = total_sent + 1 WHERE id = NEW.campaign_id;
  END IF;

  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    UPDATE email_campaigns SET total_delivered = total_delivered + 1 WHERE id = NEW.campaign_id;
  END IF;

  IF NEW.opened_at IS NOT NULL AND (OLD.opened_at IS NULL) THEN
    UPDATE email_campaigns SET total_opened = total_opened + 1 WHERE id = NEW.campaign_id;
  END IF;

  IF NEW.clicked_at IS NOT NULL AND (OLD.clicked_at IS NULL) THEN
    UPDATE email_campaigns SET total_clicked = total_clicked + 1 WHERE id = NEW.campaign_id;
  END IF;

  IF NEW.unsubscribed_at IS NOT NULL AND (OLD.unsubscribed_at IS NULL) THEN
    UPDATE email_campaigns SET total_unsubscribed = total_unsubscribed + 1 WHERE id = NEW.campaign_id;
  END IF;

  IF NEW.bounced_at IS NOT NULL AND (OLD.bounced_at IS NULL) THEN
    UPDATE email_campaigns SET total_bounced = total_bounced + 1 WHERE id = NEW.campaign_id;
  END IF;

  IF NEW.complained_at IS NOT NULL AND (OLD.complained_at IS NULL) THEN
    UPDATE email_campaigns SET total_complained = total_complained + 1 WHERE id = NEW.campaign_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update campaign stats
CREATE TRIGGER trigger_update_campaign_stats
  AFTER INSERT OR UPDATE ON email_sends
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_stats();

-- Function to check if user is unsubscribed
CREATE OR REPLACE FUNCTION is_user_unsubscribed(p_email TEXT, p_type TEXT DEFAULT 'all')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM email_unsubscribes
    WHERE email = p_email
    AND is_active = true
    AND (unsubscribe_type = 'all' OR unsubscribe_type = p_type)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_sends_updated_at BEFORE UPDATE ON email_sends
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_queue_updated_at BEFORE UPDATE ON email_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_preferences_updated_at BEFORE UPDATE ON email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can manage, users can see their own
CREATE POLICY "Admins can manage campaigns"
  ON email_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('root_admin', 'admin')
    )
  );

CREATE POLICY "Users can view their sends"
  ON email_sends FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage email sends"
  ON email_sends FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Users can view their preferences"
  ON email_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their preferences"
  ON email_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage preferences"
  ON email_preferences FOR ALL
  TO service_role
  USING (true);

-- Anyone can unsubscribe
CREATE POLICY "Anyone can unsubscribe"
  ON email_unsubscribes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their unsubscribes"
  ON email_unsubscribes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
