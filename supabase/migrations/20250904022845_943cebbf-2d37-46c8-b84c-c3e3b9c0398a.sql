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