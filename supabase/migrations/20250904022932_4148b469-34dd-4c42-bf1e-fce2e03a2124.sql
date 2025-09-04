-- Add missing RLS policies for new tables

-- RLS policies for weather_sensitive_activities
CREATE POLICY "Anyone can view weather activities"
ON weather_sensitive_activities FOR SELECT
USING (true);

CREATE POLICY "Root admins can manage weather activities"
ON weather_sensitive_activities FOR ALL
USING (get_user_role(auth.uid()) = 'root_admin');

-- RLS policies for weather_schedule_adjustments
CREATE POLICY "Users can view company weather adjustments"
ON weather_schedule_adjustments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = weather_schedule_adjustments.project_id 
        AND p.company_id = get_user_company(auth.uid())
    ) OR 
    get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Managers can create weather adjustments"
ON weather_schedule_adjustments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = weather_schedule_adjustments.project_id 
        AND p.company_id = get_user_company(auth.uid())
    ) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'field_supervisor', 'root_admin']::user_role[])
);

-- RLS policies for weather_forecasts
CREATE POLICY "Users can view company weather forecasts"
ON weather_forecasts FOR SELECT
USING (
    (project_id IS NULL) OR 
    EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = weather_forecasts.project_id 
        AND p.company_id = get_user_company(auth.uid())
    ) OR 
    get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "System can manage weather forecasts"
ON weather_forecasts FOR ALL
USING (true);

-- RLS policies for automation_rules
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

-- RLS policies for communication_templates
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

-- RLS policies for automated_communications_log  
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