-- Smart Client Updates: Enhanced Communication Automation
-- Migration for Phase 1 enhancement

-- Add automation columns to existing client_communications table if it exists
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

-- Create automated_communications_log table
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

-- Create automation_rules table
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
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

-- Create template_variables table for dynamic content
CREATE TABLE IF NOT EXISTS template_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    variable_type TEXT NOT NULL CHECK (variable_type IN ('project', 'client', 'financial', 'timeline', 'system')),
    data_source TEXT NOT NULL, -- table.column or function name
    is_active BOOLEAN DEFAULT true
);

-- Insert default template variables
INSERT INTO template_variables (name, description, variable_type, data_source) VALUES
('client_name', 'Client or customer name', 'client', 'projects.client_name'),
('project_name', 'Project name', 'project', 'projects.name'),
('project_address', 'Project address', 'project', 'projects.project_address'),
('phase_name', 'Current project phase', 'project', 'tasks.phase'),
('completion_date', 'Phase or project completion date', 'timeline', 'tasks.end_date'),
('budget_total', 'Total project budget', 'financial', 'projects.budget_total'),
('budget_spent', 'Amount spent to date', 'financial', 'projects.actual_cost'),
('budget_remaining', 'Remaining budget', 'financial', 'calculated'),
('timeline_status', 'On time, ahead, or behind schedule', 'timeline', 'calculated'),
('company_name', 'Construction company name', 'system', 'companies.name'),
('project_manager', 'Project manager name', 'project', 'user_profiles.display_name')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on all new tables
ALTER TABLE automated_communications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for automated_communications_log
CREATE POLICY "Users can view company communication logs"
ON automated_communications_log FOR SELECT
USING (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "System can insert communication logs"
ON automated_communications_log FOR INSERT
WITH CHECK (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
);

-- Create RLS policies for communication_templates
CREATE POLICY "Users can view company templates"
ON communication_templates FOR SELECT
USING (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Managers can manage templates"
ON communication_templates FOR ALL
USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
);

-- Create RLS policies for automation_rules
CREATE POLICY "Users can view company automation rules"
ON automation_rules FOR SELECT
USING (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Managers can manage automation rules"
ON automation_rules FOR ALL
USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
);

-- Create RLS policies for template_variables (read-only for most users)
CREATE POLICY "Users can view template variables"
ON template_variables FOR SELECT
USING (true);

CREATE POLICY "Root admins can manage template variables"
ON template_variables FOR ALL
USING (get_user_role(auth.uid()) = 'root_admin');

-- Create indexes for performance
CREATE INDEX idx_automated_communications_log_company_date 
ON automated_communications_log(company_id, sent_at DESC);

CREATE INDEX idx_automated_communications_log_project 
ON automated_communications_log(project_id, sent_at DESC);

CREATE INDEX idx_communication_templates_company_trigger 
ON communication_templates(company_id, trigger_type);

CREATE INDEX idx_automation_rules_company_active 
ON automation_rules(company_id, is_active) WHERE is_active = true;

CREATE INDEX idx_automation_rules_trigger_type 
ON automation_rules(trigger_type, is_active) WHERE is_active = true;

-- Add trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_communication_templates_updated_at
    BEFORE UPDATE ON communication_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to process template variables
CREATE OR REPLACE FUNCTION process_template_variables(
    template_content TEXT,
    project_id_param UUID DEFAULT NULL,
    company_id_param UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    result TEXT := template_content;
    var_record RECORD;
    replacement_value TEXT;
BEGIN
    -- Loop through all template variables and replace them
    FOR var_record IN 
        SELECT name, data_source, variable_type 
        FROM template_variables 
        WHERE is_active = true
    LOOP
        -- Skip if variable is not in template
        IF result !~ ('{{' || var_record.name || '}}') THEN
            CONTINUE;
        END IF;
        
        -- Get replacement value based on variable type and data source
        CASE var_record.variable_type
            WHEN 'project' THEN
                IF project_id_param IS NOT NULL THEN
                    EXECUTE format('SELECT %s FROM projects WHERE id = $1', var_record.data_source)
                    INTO replacement_value
                    USING project_id_param;
                END IF;
            
            WHEN 'client' THEN
                IF project_id_param IS NOT NULL THEN
                    EXECUTE format('SELECT %s FROM projects WHERE id = $1', var_record.data_source)
                    INTO replacement_value
                    USING project_id_param;
                END IF;
            
            WHEN 'system' THEN
                IF company_id_param IS NOT NULL THEN
                    EXECUTE format('SELECT %s FROM companies WHERE id = $1', var_record.data_source)
                    INTO replacement_value
                    USING company_id_param;
                END IF;
            
            WHEN 'calculated' THEN
                -- Handle calculated fields
                CASE var_record.name
                    WHEN 'budget_remaining' THEN
                        IF project_id_param IS NOT NULL THEN
                            SELECT (budget_total - COALESCE(actual_cost, 0))::TEXT
                            INTO replacement_value
                            FROM projects 
                            WHERE id = project_id_param;
                        END IF;
                    
                    WHEN 'timeline_status' THEN
                        -- Simplified timeline status calculation
                        replacement_value := 'on track';
                END CASE;
        END CASE;
        
        -- Replace the variable in the template
        IF replacement_value IS NOT NULL THEN
            result := replace(result, '{{' || var_record.name || '}}', replacement_value);
        ELSE
            -- Replace with empty string if no value found
            result := replace(result, '{{' || var_record.name || '}}', '');
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to trigger automated communications
CREATE OR REPLACE FUNCTION trigger_automated_communications(
    trigger_type_param TEXT,
    project_id_param UUID,
    trigger_data JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
    rule_record RECORD;
    processed_content TEXT;
    processed_subject TEXT;
    communications_sent INTEGER := 0;
BEGIN
    -- Find active automation rules for this trigger type and project
    FOR rule_record IN
        SELECT ar.*, ct.subject, ct.content, ct.delivery_method
        FROM automation_rules ar
        JOIN communication_templates ct ON ar.template_id = ct.id
        WHERE ar.trigger_type = trigger_type_param
        AND ar.is_active = true
        AND (ar.project_id IS NULL OR ar.project_id = project_id_param)
    LOOP
        -- Process template variables
        processed_subject := process_template_variables(
            rule_record.subject, 
            project_id_param, 
            rule_record.company_id
        );
        
        processed_content := process_template_variables(
            rule_record.content, 
            project_id_param, 
            rule_record.company_id
        );
        
        -- Log the automated communication
        INSERT INTO automated_communications_log (
            company_id,
            project_id,
            automation_rule_id,
            trigger_event,
            template_used,
            message_content,
            delivery_method,
            delivery_status
        ) VALUES (
            rule_record.company_id,
            project_id_param,
            rule_record.id,
            trigger_type_param,
            rule_record.subject,
            processed_content,
            rule_record.delivery_method,
            'pending'
        );
        
        -- Update rule statistics
        UPDATE automation_rules 
        SET 
            last_triggered = now(),
            trigger_count = trigger_count + 1
        WHERE id = rule_record.id;
        
        communications_sent := communications_sent + 1;
    END LOOP;
    
    RETURN communications_sent;
END;
$$ LANGUAGE plpgsql;

-- Create sample templates for common scenarios
INSERT INTO communication_templates (
    company_id, 
    name, 
    subject, 
    content, 
    trigger_type,
    variables
) 
SELECT 
    c.id as company_id,
    'Phase Completion Update',
    '{{project_name}} - {{phase_name}} Phase Complete!',
    'Dear {{client_name}},

We''re excited to share that we''ve successfully completed the {{phase_name}} phase of your {{project_name}} project!

Project Details:
- Phase Completed: {{phase_name}}
- Completion Date: {{completion_date}}
- Project Status: {{timeline_status}}
- Budget Status: ${{budget_spent}} spent of ${{budget_total}} total

Our team will now move on to the next phase of construction. We''ll keep you updated on our progress.

Thank you for your continued trust in {{company_name}}.

Best regards,
{{project_manager}}',
    'phase_completion',
    '["client_name", "project_name", "phase_name", "completion_date", "timeline_status", "budget_spent", "budget_total", "company_name", "project_manager"]'::jsonb
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM communication_templates ct 
    WHERE ct.company_id = c.id AND ct.name = 'Phase Completion Update'
);

-- Add comment for tracking
COMMENT ON TABLE automated_communications_log IS 'Phase 1 Enhancement: Smart Client Updates - Automated communication tracking';
COMMENT ON TABLE communication_templates IS 'Phase 1 Enhancement: Smart Client Updates - Reusable communication templates';
COMMENT ON TABLE automation_rules IS 'Phase 1 Enhancement: Smart Client Updates - Automation rule configuration';
