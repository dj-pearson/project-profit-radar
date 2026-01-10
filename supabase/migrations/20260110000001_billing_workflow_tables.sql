-- Billing Workflow Tables
-- Adds refunds, chargebacks, payment reminders, and billing automation

-- =============================================================================
-- REFUNDS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    stripe_refund_id TEXT,
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,

    -- Refund details
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    reason TEXT NOT NULL CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'service_issue', 'product_defective', 'other')),
    reason_description TEXT,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
    failure_reason TEXT,

    -- Approval workflow
    requested_by UUID REFERENCES user_profiles(id),
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    requires_approval BOOLEAN DEFAULT true,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_refunds_company_id ON refunds(company_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_invoice_id ON refunds(invoice_id);
CREATE INDEX IF NOT EXISTS idx_refunds_stripe_refund_id ON refunds(stripe_refund_id);

-- =============================================================================
-- CHARGEBACKS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS chargebacks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    stripe_dispute_id TEXT UNIQUE,
    stripe_charge_id TEXT,
    stripe_payment_intent_id TEXT,

    -- Chargeback details
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    reason TEXT NOT NULL, -- Stripe dispute reason code
    reason_description TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'needs_response' CHECK (status IN (
        'warning_needs_response', 'warning_under_review', 'warning_closed',
        'needs_response', 'under_review', 'charge_refunded', 'won', 'lost'
    )),

    -- Evidence
    evidence_submitted BOOLEAN DEFAULT false,
    evidence_due_by TIMESTAMPTZ,
    evidence JSONB DEFAULT '{}',

    -- Financial impact
    fee_amount DECIMAL(12, 2) DEFAULT 15.00,
    fee_applied BOOLEAN DEFAULT false,
    net_impact DECIMAL(12, 2), -- Total loss including fees

    -- Handling
    assigned_to UUID REFERENCES user_profiles(id),
    handled_by UUID REFERENCES user_profiles(id),
    resolved_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chargebacks_company_id ON chargebacks(company_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_status ON chargebacks(status);
CREATE INDEX IF NOT EXISTS idx_chargebacks_stripe_dispute_id ON chargebacks(stripe_dispute_id);

-- =============================================================================
-- PAYMENT REMINDER SETTINGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_reminder_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Enable/disable reminders
    is_enabled BOOLEAN DEFAULT true,

    -- Reminder schedule (days relative to due date, negative = before, positive = after)
    days_before_due INTEGER[] DEFAULT ARRAY[7, 3, 1],
    days_after_due INTEGER[] DEFAULT ARRAY[1, 3, 7, 14, 30],

    -- Email settings
    email_from_name TEXT DEFAULT 'BuildDesk',
    email_reply_to TEXT,
    include_payment_link BOOLEAN DEFAULT true,

    -- Message templates (per type)
    upcoming_subject TEXT DEFAULT 'Payment Due Soon - Invoice #{invoice_number}',
    upcoming_body TEXT DEFAULT 'Dear {client_name},\n\nThis is a friendly reminder that Invoice #{invoice_number} for ${amount} is due on {due_date}.\n\n{payment_link}\n\nThank you for your business!',

    due_today_subject TEXT DEFAULT 'Payment Due Today - Invoice #{invoice_number}',
    due_today_body TEXT DEFAULT 'Dear {client_name},\n\nYour payment for Invoice #{invoice_number} (${amount}) is due today.\n\n{payment_link}\n\nPlease submit payment at your earliest convenience.',

    overdue_subject TEXT DEFAULT 'Overdue Payment Notice - Invoice #{invoice_number}',
    overdue_body TEXT DEFAULT 'Dear {client_name},\n\nInvoice #{invoice_number} for ${amount} is now {days_overdue} days overdue.\n\n{payment_link}\n\nPlease submit payment as soon as possible to avoid late fees.',

    final_notice_subject TEXT DEFAULT 'FINAL NOTICE - Overdue Payment - Invoice #{invoice_number}',
    final_notice_body TEXT DEFAULT 'Dear {client_name},\n\nThis is a final notice regarding Invoice #{invoice_number} for ${amount}, which is now {days_overdue} days overdue.\n\nImmediate payment is required. Please contact us to resolve this matter.\n\n{payment_link}',

    -- Advanced options
    send_sms BOOLEAN DEFAULT false,
    sms_template TEXT,
    max_reminders_per_invoice INTEGER DEFAULT 10,
    pause_on_partial_payment BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_reminder_settings_company_id ON payment_reminder_settings(company_id);

-- =============================================================================
-- PAYMENT REMINDER LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_reminder_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Reminder details
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('upcoming', 'due_today', 'overdue', 'final_notice', 'custom')),
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'sms', 'both')),

    -- Recipient
    recipient_email TEXT,
    recipient_phone TEXT,
    recipient_name TEXT,

    -- Content sent
    subject TEXT,
    body TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    error_message TEXT,

    -- Tracking
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,

    -- External IDs
    email_provider_id TEXT,
    sms_provider_id TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_reminder_logs_company_id ON payment_reminder_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminder_logs_invoice_id ON payment_reminder_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminder_logs_status ON payment_reminder_logs(status);

-- =============================================================================
-- FAILED PAYMENT RECOVERY SETTINGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS failed_payment_recovery_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Enable/disable recovery
    is_enabled BOOLEAN DEFAULT true,

    -- Retry schedule (hours after failure)
    retry_intervals INTEGER[] DEFAULT ARRAY[24, 48, 72, 168], -- 1 day, 2 days, 3 days, 7 days
    max_retry_attempts INTEGER DEFAULT 4,

    -- Actions
    send_failure_notification BOOLEAN DEFAULT true,
    notify_admin_on_failure BOOLEAN DEFAULT true,
    auto_pause_subscription_after_attempts INTEGER DEFAULT 3,
    auto_cancel_subscription_after_days INTEGER DEFAULT 30,

    -- Grace period
    grace_period_days INTEGER DEFAULT 7,

    -- Customer communication
    failure_email_subject TEXT DEFAULT 'Payment Failed - Action Required',
    failure_email_body TEXT DEFAULT 'Dear {customer_name},\n\nWe were unable to process your payment of ${amount}.\n\nReason: {failure_reason}\n\nPlease update your payment method to continue your subscription.\n\n{update_payment_link}',

    -- Dunning emails
    dunning_email_intervals INTEGER[] DEFAULT ARRAY[1, 3, 7, 14], -- Days after failure
    final_warning_days_before_cancel INTEGER DEFAULT 3,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_failed_payment_recovery_settings_company_id ON failed_payment_recovery_settings(company_id);

-- =============================================================================
-- BILLING AUTOMATION RULES ENHANCEMENTS
-- =============================================================================
-- Add new columns to existing billing_automation_rules if not present
DO $$
BEGIN
    -- Add automation_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'billing_automation_rules' AND column_name = 'automation_type') THEN
        ALTER TABLE billing_automation_rules
        ADD COLUMN automation_type TEXT DEFAULT 'invoice_generation' CHECK (automation_type IN (
            'invoice_generation', 'payment_reminder', 'late_fee', 'discount_application',
            'subscription_renewal', 'usage_billing', 'recurring_charge'
        ));
    END IF;

    -- Add trigger_conditions column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'billing_automation_rules' AND column_name = 'trigger_conditions') THEN
        ALTER TABLE billing_automation_rules
        ADD COLUMN trigger_conditions JSONB DEFAULT '{}';
    END IF;

    -- Add actions column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'billing_automation_rules' AND column_name = 'actions') THEN
        ALTER TABLE billing_automation_rules
        ADD COLUMN actions JSONB DEFAULT '{}';
    END IF;

    -- Add schedule column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'billing_automation_rules' AND column_name = 'schedule') THEN
        ALTER TABLE billing_automation_rules
        ADD COLUMN schedule JSONB DEFAULT '{}';
    END IF;

    -- Add last_run_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'billing_automation_rules' AND column_name = 'last_run_at') THEN
        ALTER TABLE billing_automation_rules
        ADD COLUMN last_run_at TIMESTAMPTZ;
    END IF;

    -- Add next_run_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'billing_automation_rules' AND column_name = 'next_run_at') THEN
        ALTER TABLE billing_automation_rules
        ADD COLUMN next_run_at TIMESTAMPTZ;
    END IF;

    -- Add run_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'billing_automation_rules' AND column_name = 'run_count') THEN
        ALTER TABLE billing_automation_rules
        ADD COLUMN run_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- =============================================================================
-- USAGE BILLING RECORDS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS usage_billing_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Usage details
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(12, 4) NOT NULL,
    unit_type TEXT NOT NULL, -- 'users', 'projects', 'storage_gb', 'api_calls', etc.

    -- Billing
    billing_period_start TIMESTAMPTZ NOT NULL,
    billing_period_end TIMESTAMPTZ NOT NULL,
    unit_price DECIMAL(12, 4),
    total_amount DECIMAL(12, 2),

    -- Status
    billed BOOLEAN DEFAULT false,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    billed_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_billing_records_company_id ON usage_billing_records(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_billing_records_billing_period ON usage_billing_records(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_usage_billing_records_billed ON usage_billing_records(billed);

-- =============================================================================
-- PRORATION HISTORY TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS proration_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
    stripe_subscription_id TEXT,

    -- Plan change details
    previous_tier TEXT NOT NULL,
    new_tier TEXT NOT NULL,
    previous_period TEXT, -- 'monthly' or 'annual'
    new_period TEXT,

    -- Proration calculation
    change_date TIMESTAMPTZ NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    days_remaining INTEGER,

    -- Financial
    previous_amount DECIMAL(12, 2),
    new_amount DECIMAL(12, 2),
    credit_amount DECIMAL(12, 2), -- Credit for unused time
    charge_amount DECIMAL(12, 2), -- Charge for upgrade
    net_amount DECIMAL(12, 2), -- Net adjustment

    -- Stripe details
    stripe_invoice_id TEXT,
    stripe_proration_item_id TEXT,

    -- Status
    status TEXT DEFAULT 'calculated' CHECK (status IN ('calculated', 'applied', 'invoiced', 'paid', 'failed')),
    applied_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proration_history_company_id ON proration_history(company_id);
CREATE INDEX IF NOT EXISTS idx_proration_history_stripe_subscription_id ON proration_history(stripe_subscription_id);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Refunds RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company refunds" ON refunds
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage refunds" ON refunds
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'accounting')
        )
    );

-- Chargebacks RLS
ALTER TABLE chargebacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company chargebacks" ON chargebacks
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage chargebacks" ON chargebacks
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'accounting')
        )
    );

-- Payment Reminder Settings RLS
ALTER TABLE payment_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company reminder settings" ON payment_reminder_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage reminder settings" ON payment_reminder_settings
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'accounting')
        )
    );

-- Payment Reminder Logs RLS
ALTER TABLE payment_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company reminder logs" ON payment_reminder_logs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Failed Payment Recovery Settings RLS
ALTER TABLE failed_payment_recovery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company recovery settings" ON failed_payment_recovery_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage recovery settings" ON failed_payment_recovery_settings
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles
            WHERE id = auth.uid() AND role IN ('admin')
        )
    );

-- Usage Billing Records RLS
ALTER TABLE usage_billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company usage records" ON usage_billing_records
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Proration History RLS
ALTER TABLE proration_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company proration history" ON proration_history
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_refunds_updated_at
    BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chargebacks_updated_at
    BEFORE UPDATE ON chargebacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_reminder_settings_updated_at
    BEFORE UPDATE ON payment_reminder_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_failed_payment_recovery_settings_updated_at
    BEFORE UPDATE ON failed_payment_recovery_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
