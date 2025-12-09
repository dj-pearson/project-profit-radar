-- ============================================================================
-- Email Automation Tables Migration
-- ============================================================================
-- Creates tables for CRM email automation:
-- - email_automations: Automation rules for triggers
-- - campaign_enrollments: Track drip campaign enrollment
-- - email_queue: Enhanced queue for automated emails
-- ============================================================================

-- ============================================================================
-- 1. EMAIL AUTOMATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  company_id UUID REFERENCES companies(id),

  -- Trigger configuration
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL, -- lead_created, lead_status_changed, etc.
  entity_type VARCHAR(50) NOT NULL, -- lead, contact, opportunity, deal
  trigger_conditions JSONB DEFAULT '{}', -- Additional conditions

  -- Email configuration
  config JSONB NOT NULL DEFAULT '{}', -- EmailConfig object

  -- Status
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Indexes
  CONSTRAINT email_automations_trigger_valid CHECK (
    trigger_type IN (
      'lead_created', 'lead_status_changed', 'lead_assigned', 'lead_score_changed',
      'contact_created', 'opportunity_created', 'opportunity_stage_changed',
      'deal_won', 'deal_lost', 'follow_up_reminder', 'inactivity_reminder',
      'campaign_enrollment', 'manual'
    )
  ),
  CONSTRAINT email_automations_entity_valid CHECK (
    entity_type IN ('lead', 'contact', 'opportunity', 'deal')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_automations_site_id ON email_automations(site_id);
CREATE INDEX IF NOT EXISTS idx_email_automations_company_id ON email_automations(site_id, company_id);
CREATE INDEX IF NOT EXISTS idx_email_automations_trigger ON email_automations(site_id, trigger_type, entity_type);
CREATE INDEX IF NOT EXISTS idx_email_automations_active ON email_automations(site_id, is_active);

-- RLS Policies
ALTER TABLE email_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_automations_select" ON email_automations;
CREATE POLICY "email_automations_select" ON email_automations
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND (company_id IS NULL OR company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "email_automations_insert" ON email_automations;
CREATE POLICY "email_automations_insert" ON email_automations
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND (company_id IS NULL OR company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "email_automations_update" ON email_automations;
CREATE POLICY "email_automations_update" ON email_automations
  FOR UPDATE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND (company_id IS NULL OR company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "email_automations_delete" ON email_automations;
CREATE POLICY "email_automations_delete" ON email_automations
  FOR DELETE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND (company_id IS NULL OR company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid()))
  );

-- ============================================================================
-- 2. CAMPAIGN ENROLLMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  company_id UUID REFERENCES companies(id),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,

  -- Entity reference
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,

  -- Progress tracking
  status VARCHAR(20) DEFAULT 'active', -- active, paused, completed, cancelled
  current_step INTEGER DEFAULT 0,
  steps_completed INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,

  -- Timestamps
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  last_email_sent_at TIMESTAMPTZ,

  -- Metadata
  enrollment_metadata JSONB DEFAULT '{}',

  -- Unique constraint to prevent duplicate enrollments
  CONSTRAINT campaign_enrollments_unique UNIQUE (campaign_id, entity_type, entity_id, site_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_site_id ON campaign_enrollments(site_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_campaign ON campaign_enrollments(campaign_id, site_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_entity ON campaign_enrollments(entity_type, entity_id, site_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_status ON campaign_enrollments(status, site_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_recipient ON campaign_enrollments(recipient_email, site_id);

-- RLS Policies
ALTER TABLE campaign_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_enrollments_select" ON campaign_enrollments;
CREATE POLICY "campaign_enrollments_select" ON campaign_enrollments
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "campaign_enrollments_insert" ON campaign_enrollments;
CREATE POLICY "campaign_enrollments_insert" ON campaign_enrollments
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "campaign_enrollments_update" ON campaign_enrollments;
CREATE POLICY "campaign_enrollments_update" ON campaign_enrollments
  FOR UPDATE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "campaign_enrollments_delete" ON campaign_enrollments;
CREATE POLICY "campaign_enrollments_delete" ON campaign_enrollments
  FOR DELETE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 3. ENHANCE EMAIL_QUEUE TABLE
-- ============================================================================

-- Add new columns if they don't exist
DO $$
BEGIN
  -- Add automation_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'automation_id') THEN
    ALTER TABLE email_queue ADD COLUMN automation_id UUID REFERENCES email_automations(id);
  END IF;

  -- Add enrollment_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'enrollment_id') THEN
    ALTER TABLE email_queue ADD COLUMN enrollment_id UUID REFERENCES campaign_enrollments(id);
  END IF;

  -- Add html_content column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'html_content') THEN
    ALTER TABLE email_queue ADD COLUMN html_content TEXT;
  END IF;

  -- Add text_content column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'text_content') THEN
    ALTER TABLE email_queue ADD COLUMN text_content TEXT;
  END IF;

  -- Add from_email column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'from_email') THEN
    ALTER TABLE email_queue ADD COLUMN from_email VARCHAR(255);
  END IF;

  -- Add from_name column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'from_name') THEN
    ALTER TABLE email_queue ADD COLUMN from_name VARCHAR(255);
  END IF;

  -- Add reply_to column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'reply_to') THEN
    ALTER TABLE email_queue ADD COLUMN reply_to VARCHAR(255);
  END IF;

  -- Add subject column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'subject') THEN
    ALTER TABLE email_queue ADD COLUMN subject VARCHAR(500);
  END IF;

  -- Add company_id column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'company_id') THEN
    ALTER TABLE email_queue ADD COLUMN company_id UUID REFERENCES companies(id);
  END IF;
END $$;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_automation ON email_queue(automation_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_enrollment ON email_queue(enrollment_id);

-- ============================================================================
-- 4. ADD sequence_steps TO EMAIL_CAMPAIGNS
-- ============================================================================

DO $$
BEGIN
  -- Add sequence_steps column for drip campaign steps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_campaigns' AND column_name = 'sequence_steps') THEN
    ALTER TABLE email_campaigns ADD COLUMN sequence_steps JSONB DEFAULT '[]';
  END IF;

  -- Add campaign_goals column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_campaigns' AND column_name = 'campaign_goals') THEN
    ALTER TABLE email_campaigns ADD COLUMN campaign_goals JSONB DEFAULT '{}';
  END IF;

  -- Add enrollment_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_campaigns' AND column_name = 'enrollment_count') THEN
    ALTER TABLE email_campaigns ADD COLUMN enrollment_count INTEGER DEFAULT 0;
  END IF;

  -- Add completion_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_campaigns' AND column_name = 'completion_count') THEN
    ALTER TABLE email_campaigns ADD COLUMN completion_count INTEGER DEFAULT 0;
  END IF;

  -- Add conversion_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_campaigns' AND column_name = 'conversion_count') THEN
    ALTER TABLE email_campaigns ADD COLUMN conversion_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- 5. EMAIL AUTOMATION TRIGGERS (Database triggers)
-- ============================================================================

-- Create function to trigger email automations
CREATE OR REPLACE FUNCTION trigger_email_automation()
RETURNS TRIGGER AS $$
DECLARE
  automation_record RECORD;
  trigger_type_value TEXT;
BEGIN
  -- Determine trigger type based on operation and table
  IF TG_TABLE_NAME = 'leads' THEN
    IF TG_OP = 'INSERT' THEN
      trigger_type_value := 'lead_created';
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.status IS DISTINCT FROM NEW.status OR OLD.lead_status IS DISTINCT FROM NEW.lead_status THEN
        trigger_type_value := 'lead_status_changed';
      ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        trigger_type_value := 'lead_assigned';
      ELSIF OLD.lead_score IS DISTINCT FROM NEW.lead_score THEN
        trigger_type_value := 'lead_score_changed';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'contacts' THEN
    IF TG_OP = 'INSERT' THEN
      trigger_type_value := 'contact_created';
    END IF;
  ELSIF TG_TABLE_NAME = 'opportunities' THEN
    IF TG_OP = 'INSERT' THEN
      trigger_type_value := 'opportunity_created';
    ELSIF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
      trigger_type_value := 'opportunity_stage_changed';
    END IF;
  ELSIF TG_TABLE_NAME = 'deals' THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.status = 'won' AND OLD.status != 'won' THEN
        trigger_type_value := 'deal_won';
      ELSIF NEW.status = 'lost' AND OLD.status != 'lost' THEN
        trigger_type_value := 'deal_lost';
      END IF;
    END IF;
  END IF;

  -- If no trigger type determined, skip
  IF trigger_type_value IS NULL THEN
    RETURN NEW;
  END IF;

  -- Note: Actual email automation is handled by edge function
  -- This trigger just logs the event for debugging/auditing
  INSERT INTO audit_logs (
    site_id,
    company_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    metadata,
    created_at
  ) VALUES (
    NEW.site_id,
    COALESCE(NEW.company_id, NULL),
    trigger_type_value,
    TG_TABLE_NAME,
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    row_to_json(NEW),
    jsonb_build_object('trigger_type', trigger_type_value, 'automated', true),
    now()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block the main operation if audit fails
    RAISE WARNING 'Email automation trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for leads (only if not exists)
DROP TRIGGER IF EXISTS trigger_lead_email_automation ON leads;
CREATE TRIGGER trigger_lead_email_automation
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_email_automation();

-- Create triggers for contacts (only if not exists)
DROP TRIGGER IF EXISTS trigger_contact_email_automation ON contacts;
CREATE TRIGGER trigger_contact_email_automation
  AFTER INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_email_automation();

-- Create triggers for opportunities (only if not exists)
DROP TRIGGER IF EXISTS trigger_opportunity_email_automation ON opportunities;
CREATE TRIGGER trigger_opportunity_email_automation
  AFTER INSERT OR UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_email_automation();

-- Create triggers for deals (only if not exists)
DROP TRIGGER IF EXISTS trigger_deal_email_automation ON deals;
CREATE TRIGGER trigger_deal_email_automation
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_email_automation();

-- ============================================================================
-- 6. INSERT DEFAULT AUTOMATION TEMPLATES
-- ============================================================================

-- Insert default email automations for BuildDesk site
DO $$
DECLARE
  builddesk_site_id UUID;
BEGIN
  -- Get BuildDesk site ID
  SELECT id INTO builddesk_site_id FROM sites WHERE key = 'builddesk' LIMIT 1;

  IF builddesk_site_id IS NOT NULL THEN
    -- New Lead Welcome Email
    INSERT INTO email_automations (site_id, name, description, trigger_type, entity_type, config, is_active)
    VALUES (
      builddesk_site_id,
      'New Lead Welcome',
      'Send welcome email when a new lead is created',
      'lead_created',
      'lead',
      '{
        "subject": "Welcome to BuildDesk - Let''s Build Something Great!",
        "fromEmail": "hello@build-desk.com",
        "fromName": "BuildDesk Team",
        "delay": 0,
        "htmlContent": "<h1>Welcome, {{first_name}}!</h1><p>Thank you for your interest in BuildDesk. We''re excited to help you streamline your construction management.</p><p>One of our team members will reach out shortly to discuss your needs.</p><p>Best regards,<br>The BuildDesk Team</p>"
      }',
      true
    )
    ON CONFLICT DO NOTHING;

    -- Lead Status Changed - Qualified
    INSERT INTO email_automations (site_id, name, description, trigger_type, entity_type, config, trigger_conditions, is_active)
    VALUES (
      builddesk_site_id,
      'Lead Qualified Notification',
      'Send notification when a lead is marked as qualified',
      'lead_status_changed',
      'lead',
      '{
        "subject": "Great News About Your Project, {{first_name}}!",
        "fromEmail": "sales@build-desk.com",
        "fromName": "BuildDesk Sales",
        "delay": 0,
        "htmlContent": "<p>Hi {{first_name}},</p><p>We''ve reviewed your requirements and believe BuildDesk is a great fit for {{company_name}}!</p><p>Let''s schedule a personalized demo to show you how we can help with your {{project_type}} projects.</p><p>Best,<br>BuildDesk Team</p>"
      }',
      '{"new_status": "qualified"}',
      true
    )
    ON CONFLICT DO NOTHING;

    -- Opportunity Stage Changed - Proposal Sent
    INSERT INTO email_automations (site_id, name, description, trigger_type, entity_type, config, trigger_conditions, is_active)
    VALUES (
      builddesk_site_id,
      'Proposal Follow-up',
      'Follow up 2 days after proposal is sent',
      'opportunity_stage_changed',
      'opportunity',
      '{
        "subject": "Following Up on Your BuildDesk Proposal",
        "fromEmail": "sales@build-desk.com",
        "fromName": "BuildDesk Sales",
        "delay": 2880,
        "htmlContent": "<p>Hi {{first_name}},</p><p>I wanted to follow up on the proposal we sent for {{project_name}}.</p><p>Do you have any questions about the features or pricing? I''d be happy to schedule a call to discuss.</p><p>Best regards,<br>BuildDesk Team</p>"
      }',
      '{"new_stage": "proposal"}',
      true
    )
    ON CONFLICT DO NOTHING;

    -- Deal Won - Thank You
    INSERT INTO email_automations (site_id, name, description, trigger_type, entity_type, config, is_active)
    VALUES (
      builddesk_site_id,
      'Deal Won - Welcome Aboard',
      'Welcome new customer when deal is won',
      'deal_won',
      'deal',
      '{
        "subject": "Welcome to the BuildDesk Family, {{first_name}}!",
        "fromEmail": "success@build-desk.com",
        "fromName": "BuildDesk Customer Success",
        "delay": 0,
        "htmlContent": "<h1>Welcome Aboard! 🎉</h1><p>Hi {{first_name}},</p><p>We''re thrilled to welcome {{company_name}} to the BuildDesk family!</p><p>Here''s what happens next:</p><ul><li>You''ll receive your login credentials within 24 hours</li><li>Our onboarding team will schedule a kickoff call</li><li>We''ll help you import your existing project data</li></ul><p>We''re here to make your construction management easier!</p><p>Best,<br>The BuildDesk Team</p>"
      }',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION COMMENT
-- ============================================================================
-- Run the following to verify:
-- SELECT * FROM email_automations LIMIT 5;
-- SELECT * FROM campaign_enrollments LIMIT 5;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'email_queue';
