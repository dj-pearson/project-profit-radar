-- Weather Integration: Weather-Integrated Scheduling
-- Migration for Phase 1 enhancement #2

-- Create weather_sensitive_activities table
CREATE TABLE IF NOT EXISTS weather_sensitive_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type TEXT NOT NULL UNIQUE,
    min_temperature INTEGER, -- Minimum temperature in Fahrenheit
    max_temperature INTEGER, -- Maximum temperature in Fahrenheit
    max_wind_speed INTEGER,  -- Maximum wind speed in mph
    precipitation_threshold DECIMAL(3,1), -- Maximum precipitation in inches
    humidity_threshold INTEGER, -- Maximum humidity percentage
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weather_schedule_adjustments table
CREATE TABLE IF NOT EXISTS weather_schedule_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    original_date DATE NOT NULL,
    adjusted_date DATE NOT NULL,
    weather_reason TEXT NOT NULL,
    weather_data JSONB DEFAULT '{}',
    auto_adjusted BOOLEAN DEFAULT false,
    adjustment_impact_score INTEGER DEFAULT 0,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weather_forecasts table for caching
CREATE TABLE IF NOT EXISTS weather_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    temperature_min INTEGER,
    temperature_max INTEGER,
    humidity INTEGER,
    wind_speed INTEGER,
    precipitation DECIMAL(4,2),
    conditions TEXT,
    description TEXT,
    forecast_data JSONB DEFAULT '{}',
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '6 hours')
);

-- Add weather-related columns to existing tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS weather_sensitive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weather_constraints JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS weather_last_check TIMESTAMP WITH TIME ZONE;

-- Insert default weather-sensitive activities
INSERT INTO weather_sensitive_activities (activity_type, min_temperature, max_temperature, max_wind_speed, precipitation_threshold, humidity_threshold, description) VALUES
('site_prep', 32, 95, 25, 0.1, 90, 'Site preparation and clearing work'),
('excavation', 32, 95, 30, 0.2, NULL, 'Excavation and earthwork'),
('foundation', 32, 90, 25, 0.1, NULL, 'Foundation work including concrete pouring'),
('concrete_work', 40, 85, 20, 0.05, 85, 'Concrete pouring and finishing'),
('framing', 20, 100, 35, 0.3, NULL, 'Structural framing work'),
('roofing', 45, 85, 20, 0.05, NULL, 'Roofing installation and repair'),
('siding', 32, 95, 25, 0.1, 90, 'Exterior siding installation'),
('painting_exterior', 50, 85, 15, 0.05, 80, 'Exterior painting work'),
('landscaping', 35, 95, 25, 0.2, NULL, 'Landscaping and outdoor work'),
('paving', 40, 90, 20, 0.1, NULL, 'Paving and asphalt work'),
('masonry', 32, 90, 25, 0.1, NULL, 'Masonry and stonework'),
('welding_outdoor', 32, 95, 15, 0.05, 85, 'Outdoor welding operations')
ON CONFLICT (activity_type) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE weather_sensitive_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_schedule_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_forecasts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for weather_sensitive_activities (global read, admin write)
CREATE POLICY "Anyone can view weather activities"
ON weather_sensitive_activities FOR SELECT
USING (true);

CREATE POLICY "Root admins can manage weather activities"
ON weather_sensitive_activities FOR ALL
USING (get_user_role(auth.uid()) = 'root_admin');

-- Create RLS policies for weather_schedule_adjustments
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

-- Create RLS policies for weather_forecasts
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

-- Create indexes for performance
CREATE INDEX idx_weather_schedule_adjustments_project_date 
ON weather_schedule_adjustments(project_id, original_date);

CREATE INDEX idx_weather_schedule_adjustments_auto_adjusted 
ON weather_schedule_adjustments(auto_adjusted, created_at) WHERE auto_adjusted = true;

CREATE INDEX idx_weather_forecasts_project_date 
ON weather_forecasts(project_id, forecast_date);

CREATE INDEX idx_weather_forecasts_location_date 
ON weather_forecasts(latitude, longitude, forecast_date);

CREATE INDEX idx_weather_forecasts_expires 
ON weather_forecasts(expires_at) WHERE expires_at > now();

CREATE INDEX idx_tasks_weather_sensitive 
ON tasks(weather_sensitive, start_date) WHERE weather_sensitive = true;

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_weather_sensitive_activities_updated_at
    BEFORE UPDATE ON weather_sensitive_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to check weather impact for a task
CREATE OR REPLACE FUNCTION check_weather_impact_for_task(
    task_id_param UUID,
    check_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB AS $$
DECLARE
    task_record RECORD;
    weather_record RECORD;
    activity_rules RECORD;
    impact_result JSONB := '{"suitable": true, "issues": [], "recommendations": []}';
    issues JSONB := '[]';
    recommendations JSONB := '[]';
BEGIN
    -- Get task details
    SELECT t.*, p.gps_coordinates, p.project_address
    INTO task_record
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_id_param;
    
    IF NOT FOUND THEN
        RETURN '{"error": "Task not found"}';
    END IF;
    
    -- Skip if task is not weather sensitive
    IF NOT task_record.weather_sensitive THEN
        RETURN '{"suitable": true, "weather_sensitive": false}';
    END IF;
    
    -- Get weather sensitivity rules for this activity type
    SELECT *
    INTO activity_rules
    FROM weather_sensitive_activities
    WHERE activity_type = task_record.construction_phase
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN '{"suitable": true, "no_rules_found": true}';
    END IF;
    
    -- Get weather forecast for the date and location
    SELECT *
    INTO weather_record
    FROM weather_forecasts
    WHERE forecast_date = check_date
    AND expires_at > now()
    ORDER BY fetched_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN '{"suitable": true, "no_weather_data": true}';
    END IF;
    
    -- Check temperature constraints
    IF activity_rules.min_temperature IS NOT NULL AND weather_record.temperature_min < activity_rules.min_temperature THEN
        issues := issues || jsonb_build_object(
            'type', 'temperature_low',
            'message', format('Temperature too low: %s°F (minimum: %s°F)', weather_record.temperature_min, activity_rules.min_temperature),
            'severity', 'high'
        );
        recommendations := recommendations || '"Consider rescheduling or using heating equipment"';
        impact_result := jsonb_set(impact_result, '{suitable}', 'false');
    END IF;
    
    IF activity_rules.max_temperature IS NOT NULL AND weather_record.temperature_max > activity_rules.max_temperature THEN
        issues := issues || jsonb_build_object(
            'type', 'temperature_high',
            'message', format('Temperature too high: %s°F (maximum: %s°F)', weather_record.temperature_max, activity_rules.max_temperature),
            'severity', 'high'
        );
        recommendations := recommendations || '"Consider rescheduling or adjusting work hours"';
        impact_result := jsonb_set(impact_result, '{suitable}', 'false');
    END IF;
    
    -- Check wind constraints
    IF activity_rules.max_wind_speed IS NOT NULL AND weather_record.wind_speed > activity_rules.max_wind_speed THEN
        issues := issues || jsonb_build_object(
            'type', 'wind_high',
            'message', format('Wind too strong: %s mph (maximum: %s mph)', weather_record.wind_speed, activity_rules.max_wind_speed),
            'severity', 'high'
        );
        recommendations := recommendations || '"Consider postponing work until wind subsides"';
        impact_result := jsonb_set(impact_result, '{suitable}', 'false');
    END IF;
    
    -- Check precipitation constraints
    IF activity_rules.precipitation_threshold IS NOT NULL AND weather_record.precipitation > activity_rules.precipitation_threshold THEN
        issues := issues || jsonb_build_object(
            'type', 'precipitation_high',
            'message', format('Too much precipitation: %s" (maximum: %s")', weather_record.precipitation, activity_rules.precipitation_threshold),
            'severity', 'high'
        );
        recommendations := recommendations || '"Reschedule outdoor work due to precipitation"';
        impact_result := jsonb_set(impact_result, '{suitable}', 'false');
    END IF;
    
    -- Check humidity constraints
    IF activity_rules.humidity_threshold IS NOT NULL AND weather_record.humidity > activity_rules.humidity_threshold THEN
        issues := issues || jsonb_build_object(
            'type', 'humidity_high',
            'message', format('Humidity too high: %s%% (maximum: %s%%)', weather_record.humidity, activity_rules.humidity_threshold),
            'severity', 'medium'
        );
        recommendations := recommendations || '"Monitor worker comfort and adjust break schedules"';
        -- High humidity is usually caution, not unsuitable
        IF impact_result->>'suitable' = 'true' THEN
            impact_result := jsonb_set(impact_result, '{suitable}', '"caution"');
        END IF;
    END IF;
    
    -- Add issues and recommendations to result
    impact_result := jsonb_set(impact_result, '{issues}', issues);
    impact_result := jsonb_set(impact_result, '{recommendations}', recommendations);
    impact_result := jsonb_set(impact_result, '{weather_data}', to_jsonb(weather_record));
    impact_result := jsonb_set(impact_result, '{activity_rules}', to_jsonb(activity_rules));
    
    RETURN impact_result;
END;
$$ LANGUAGE plpgsql;

-- Create function to get weather-impacted tasks for a project
CREATE OR REPLACE FUNCTION get_weather_impacted_tasks(
    project_id_param UUID,
    date_range_start DATE DEFAULT CURRENT_DATE,
    date_range_end DATE DEFAULT CURRENT_DATE + INTERVAL '7 days'
) RETURNS TABLE (
    task_id UUID,
    task_name TEXT,
    scheduled_date DATE,
    weather_impact JSONB,
    recommended_action TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as task_id,
        t.name as task_name,
        t.start_date::DATE as scheduled_date,
        check_weather_impact_for_task(t.id, t.start_date::DATE) as weather_impact,
        CASE 
            WHEN (check_weather_impact_for_task(t.id, t.start_date::DATE)->>'suitable')::TEXT = 'false' THEN 'Reschedule recommended'
            WHEN (check_weather_impact_for_task(t.id, t.start_date::DATE)->>'suitable')::TEXT = 'caution' THEN 'Monitor conditions'
            ELSE 'No action needed'
        END as recommended_action
    FROM tasks t
    WHERE t.project_id = project_id_param
    AND t.weather_sensitive = true
    AND t.start_date::DATE BETWEEN date_range_start AND date_range_end
    AND t.status != 'completed'
    ORDER BY t.start_date;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically check and log weather impacts
CREATE OR REPLACE FUNCTION check_daily_weather_impacts() RETURNS INTEGER AS $$
DECLARE
    project_record RECORD;
    task_record RECORD;
    weather_impact JSONB;
    adjustments_made INTEGER := 0;
BEGIN
    -- Check all active projects with weather-sensitive tasks
    FOR project_record IN
        SELECT DISTINCT p.id, p.name, p.company_id
        FROM projects p
        JOIN tasks t ON p.id = t.project_id
        WHERE p.status = 'active'
        AND t.weather_sensitive = true
        AND t.start_date::DATE = CURRENT_DATE + INTERVAL '1 day' -- Check tomorrow's tasks
        AND t.status != 'completed'
    LOOP
        -- Check each weather-sensitive task
        FOR task_record IN
            SELECT id, name, start_date, construction_phase
            FROM tasks
            WHERE project_id = project_record.id
            AND weather_sensitive = true
            AND start_date::DATE = CURRENT_DATE + INTERVAL '1 day'
            AND status != 'completed'
        LOOP
            -- Check weather impact
            weather_impact := check_weather_impact_for_task(task_record.id, (CURRENT_DATE + INTERVAL '1 day')::DATE);
            
            -- If weather is unsuitable, create an adjustment recommendation
            IF (weather_impact->>'suitable')::TEXT = 'false' THEN
                INSERT INTO weather_schedule_adjustments (
                    project_id,
                    task_id,
                    original_date,
                    adjusted_date,
                    weather_reason,
                    weather_data,
                    auto_adjusted
                ) VALUES (
                    project_record.id,
                    task_record.id,
                    (CURRENT_DATE + INTERVAL '1 day')::DATE,
                    (CURRENT_DATE + INTERVAL '3 days')::DATE, -- Suggest 3 days later
                    array_to_string(ARRAY(SELECT jsonb_array_elements_text(weather_impact->'issues')), '; '),
                    weather_impact->'weather_data',
                    false -- Require manual approval
                );
                
                adjustments_made := adjustments_made + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN adjustments_made;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old weather forecasts
CREATE OR REPLACE FUNCTION cleanup_old_weather_forecasts() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM weather_forecasts 
    WHERE expires_at < now() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for tracking
COMMENT ON TABLE weather_sensitive_activities IS 'Phase 1 Enhancement: Weather Integration - Activity weather sensitivity configuration';
COMMENT ON TABLE weather_schedule_adjustments IS 'Phase 1 Enhancement: Weather Integration - Weather-based schedule adjustments';
COMMENT ON TABLE weather_forecasts IS 'Phase 1 Enhancement: Weather Integration - Cached weather forecast data';
