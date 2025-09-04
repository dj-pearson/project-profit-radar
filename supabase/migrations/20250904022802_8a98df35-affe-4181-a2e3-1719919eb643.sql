-- Fix Smart Client Updates migration by removing circular dependency
-- Create tables in correct order to avoid foreign key issues

-- Create automation_rules table first (without the foreign key to templates)
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    template_id UUID, -- Will add FK constraint after templates table exists
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('phase_completion', 'delay_detected', 'budget_variance', 'milestone_reached')),
    trigger_conditions JSONB DEFAULT '{}',
    recipient_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create communication_templates table
CREATE TABLE IF NOT EXISTS communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('phase_completion', 'delay_detected', 'budget_variance', 'milestone_reached', 'manual')),
    variables JSONB DEFAULT '[]',
    attachments_config JSONB DEFAULT '{}',
    delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'portal_notification', 'sms')),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Now add the foreign key constraint to automation_rules
ALTER TABLE automation_rules 
ADD CONSTRAINT fk_automation_rules_template 
FOREIGN KEY (template_id) REFERENCES communication_templates(id) ON DELETE CASCADE;

-- Create automated_communications_log table (now both referenced tables exist)
CREATE TABLE IF NOT EXISTS automated_communications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    automation_rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
    trigger_event TEXT NOT NULL,
    template_used TEXT,
    recipients JSONB DEFAULT '[]',
    message_content TEXT,
    attachments JSONB DEFAULT '[]',
    delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'portal_notification', 'sms')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Add client_communications table enhancements
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_communications') THEN
        -- Add automation columns to existing table
        ALTER TABLE client_communications 
        ADD COLUMN IF NOT EXISTS automation_rules JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS auto_trigger_conditions JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false;
    ELSE
        -- Create client_communications table if it doesn't exist
        CREATE TABLE client_communications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
            communication_type TEXT NOT NULL DEFAULT 'update',
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'read', 'failed')),
            recipients JSONB DEFAULT '[]',
            attachments JSONB DEFAULT '[]',
            automation_rules JSONB DEFAULT '{}',
            auto_trigger_conditions JSONB DEFAULT '{}',
            is_automated BOOLEAN DEFAULT false,
            sent_at TIMESTAMP WITH TIME ZONE,
            created_by UUID REFERENCES user_profiles(id),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
    END IF;
END $$;