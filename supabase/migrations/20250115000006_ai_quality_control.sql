-- AI-Powered Quality Control System Database Schema

-- Create quality_inspections table
CREATE TABLE IF NOT EXISTS quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  inspector_type TEXT DEFAULT 'ai' CHECK (inspector_type IN ('human', 'ai', 'hybrid')),
  inspection_date TIMESTAMPTZ DEFAULT NOW(),
  overall_score DECIMAL(5,2) DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'requires_attention')),
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  human_verification JSONB,
  defects_detected JSONB DEFAULT '[]'::jsonb,
  recommendations TEXT[] DEFAULT '{}',
  inspection_type TEXT DEFAULT 'routine' CHECK (inspection_type IN ('routine', 'milestone', 'final', 'compliance')),
  weather_conditions TEXT,
  inspector_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quality_photos table
CREATE TABLE IF NOT EXISTS quality_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES quality_inspections(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT DEFAULT 'image/jpeg',
  capture_timestamp TIMESTAMPTZ DEFAULT NOW(),
  camera_metadata JSONB DEFAULT '{}'::jsonb,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  annotations JSONB DEFAULT '[]'::jsonb,
  comparison_photos JSONB DEFAULT '[]'::jsonb,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quality_defects table
CREATE TABLE IF NOT EXISTS quality_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES quality_inspections(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  defect_type TEXT NOT NULL,
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  location TEXT,
  description TEXT NOT NULL,
  photo_evidence TEXT[] DEFAULT '{}',
  bounding_box JSONB, -- {x, y, width, height}
  confidence_score DECIMAL(3,2) DEFAULT 0,
  remediation_plan JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'deferred', 'false_positive')),
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  resolved_date TIMESTAMPTZ,
  resolution_notes TEXT,
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  actual_cost DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quality_standards table for compliance checking
CREATE TABLE IF NOT EXISTS quality_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_name TEXT NOT NULL,
  standard_version TEXT,
  category TEXT NOT NULL, -- 'building_code', 'safety', 'quality', 'environmental'
  requirements JSONB DEFAULT '[]'::jsonb,
  compliance_criteria JSONB DEFAULT '{}'::jsonb,
  applicable_trades TEXT[] DEFAULT '{}',
  region TEXT DEFAULT 'US',
  effective_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(standard_name, standard_version, region)
);

-- Create quality_annotations table for detailed photo annotations
CREATE TABLE IF NOT EXISTS quality_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES quality_photos(id) ON DELETE CASCADE,
  annotation_type TEXT DEFAULT 'note' CHECK (annotation_type IN ('defect', 'measurement', 'note', 'approval', 'concern')),
  coordinates JSONB NOT NULL, -- {x, y}
  text_content TEXT NOT NULL,
  created_by_type TEXT DEFAULT 'ai' CHECK (created_by_type IN ('ai', 'inspector', 'supervisor')),
  created_by UUID REFERENCES auth.users(id),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quality_measurements table for automated measurements
CREATE TABLE IF NOT EXISTS quality_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES quality_photos(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('length', 'width', 'height', 'angle', 'area', 'volume')),
  measured_value DECIMAL(10,4) NOT NULL,
  unit TEXT NOT NULL,
  accuracy_confidence DECIMAL(3,2) DEFAULT 0,
  reference_points JSONB, -- Array of {x, y} coordinates
  tolerance_check BOOLEAN DEFAULT false,
  expected_value DECIMAL(10,4),
  tolerance_range JSONB, -- {min, max}
  passes_specification BOOLEAN,
  deviation_percentage DECIMAL(5,2),
  measurement_method TEXT DEFAULT 'ai_vision' CHECK (measurement_method IN ('ai_vision', 'manual', 'laser', 'photogrammetry')),
  calibration_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quality_compliance_checks table
CREATE TABLE IF NOT EXISTS quality_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES quality_inspections(id) ON DELETE CASCADE,
  standard_id UUID REFERENCES quality_standards(id) ON DELETE CASCADE,
  compliance_score DECIMAL(3,2) DEFAULT 0,
  violations_detected JSONB DEFAULT '[]'::jsonb,
  certification_status TEXT DEFAULT 'pending' CHECK (certification_status IN ('compliant', 'minor_issues', 'major_issues', 'non_compliant', 'pending')),
  review_required BOOLEAN DEFAULT false,
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_model_versions table for tracking AI model performance
CREATE TABLE IF NOT EXISTS ai_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  version TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('object_detection', 'defect_detection', 'quality_assessment', 'measurement', 'compliance')),
  accuracy_metrics JSONB DEFAULT '{}'::jsonb,
  deployment_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  training_data_info JSONB,
  performance_benchmarks JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_name, version)
);

-- Create quality_trends table for tracking quality metrics over time
CREATE TABLE IF NOT EXISTS quality_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  measurement_date DATE DEFAULT CURRENT_DATE,
  average_quality_score DECIMAL(5,2) DEFAULT 0,
  total_inspections INTEGER DEFAULT 0,
  total_defects INTEGER DEFAULT 0,
  critical_defects INTEGER DEFAULT 0,
  major_defects INTEGER DEFAULT 0,
  minor_defects INTEGER DEFAULT 0,
  compliance_score DECIMAL(3,2) DEFAULT 0,
  trend_direction TEXT CHECK (trend_direction IN ('improving', 'declining', 'stable')),
  trend_analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, measurement_date)
);

-- Create remediation_plans table
CREATE TABLE IF NOT EXISTS remediation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID REFERENCES quality_defects(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  steps JSONB DEFAULT '[]'::jsonb,
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  estimated_duration_hours INTEGER DEFAULT 0,
  required_materials TEXT[] DEFAULT '{}',
  required_skills TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed', 'cancelled')),
  assigned_to UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  actual_cost DECIMAL(10,2),
  actual_duration_hours INTEGER,
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quality_inspections_project_date ON quality_inspections(project_id, inspection_date);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_status ON quality_inspections(status, inspection_date);
CREATE INDEX IF NOT EXISTS idx_quality_photos_inspection ON quality_photos(inspection_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_quality_defects_severity ON quality_defects(severity, status);
CREATE INDEX IF NOT EXISTS idx_quality_defects_project ON quality_defects(project_id, status);
CREATE INDEX IF NOT EXISTS idx_quality_measurements_photo ON quality_measurements(photo_id, measurement_type);
CREATE INDEX IF NOT EXISTS idx_quality_compliance_standard ON quality_compliance_checks(standard_id, certification_status);
CREATE INDEX IF NOT EXISTS idx_quality_trends_project_date ON quality_trends(project_id, measurement_date);
CREATE INDEX IF NOT EXISTS idx_remediation_plans_defect ON remediation_plans(defect_id, status);

-- Create function to automatically update quality trends
CREATE OR REPLACE FUNCTION update_quality_trends()
RETURNS TRIGGER AS $$
DECLARE
    trend_record RECORD;
    current_date DATE := CURRENT_DATE;
BEGIN
    -- Calculate daily quality metrics for the project
    SELECT 
        AVG(overall_score) as avg_score,
        COUNT(*) as total_inspections,
        SUM(jsonb_array_length(defects_detected)) as total_defects,
        SUM(CASE WHEN jsonb_path_exists(defects_detected, '$[*] ? (@.severity == "critical")') THEN 1 ELSE 0 END) as critical_defects,
        SUM(CASE WHEN jsonb_path_exists(defects_detected, '$[*] ? (@.severity == "major")') THEN 1 ELSE 0 END) as major_defects,
        SUM(CASE WHEN jsonb_path_exists(defects_detected, '$[*] ? (@.severity == "minor")') THEN 1 ELSE 0 END) as minor_defects
    INTO trend_record
    FROM quality_inspections
    WHERE project_id = NEW.project_id
    AND DATE(inspection_date) = current_date;

    -- Insert or update quality trend record
    INSERT INTO quality_trends (
        project_id,
        measurement_date,
        average_quality_score,
        total_inspections,
        total_defects,
        critical_defects,
        major_defects,
        minor_defects
    ) VALUES (
        NEW.project_id,
        current_date,
        COALESCE(trend_record.avg_score, 0),
        COALESCE(trend_record.total_inspections, 0),
        COALESCE(trend_record.total_defects, 0),
        COALESCE(trend_record.critical_defects, 0),
        COALESCE(trend_record.major_defects, 0),
        COALESCE(trend_record.minor_defects, 0)
    )
    ON CONFLICT (project_id, measurement_date)
    DO UPDATE SET
        average_quality_score = EXCLUDED.average_quality_score,
        total_inspections = EXCLUDED.total_inspections,
        total_defects = EXCLUDED.total_defects,
        critical_defects = EXCLUDED.critical_defects,
        major_defects = EXCLUDED.major_defects,
        minor_defects = EXCLUDED.minor_defects,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quality_trends
    AFTER INSERT OR UPDATE ON quality_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_quality_trends();

-- Create function to auto-assign defects based on severity
CREATE OR REPLACE FUNCTION auto_assign_defects()
RETURNS TRIGGER AS $$
DECLARE
    supervisor_id UUID;
    project_manager_id UUID;
BEGIN
    -- Auto-assign critical and major defects
    IF NEW.severity IN ('critical', 'major') THEN
        -- Find project manager for the project
        SELECT ur.user_id INTO project_manager_id
        FROM user_roles ur
        JOIN projects p ON ur.company_id = p.company_id
        WHERE p.id = NEW.project_id
        AND ur.role = 'project_manager'
        LIMIT 1;

        -- Assign to project manager if found
        IF project_manager_id IS NOT NULL THEN
            NEW.assigned_to := project_manager_id;
        END IF;

        -- Set due date based on severity
        IF NEW.severity = 'critical' THEN
            NEW.due_date := CURRENT_DATE + INTERVAL '1 day';
        ELSIF NEW.severity = 'major' THEN
            NEW.due_date := CURRENT_DATE + INTERVAL '3 days';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_assign_defects
    BEFORE INSERT ON quality_defects
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_defects();

-- Create function to calculate compliance scores
CREATE OR REPLACE FUNCTION calculate_compliance_score(
    p_inspection_id UUID
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    total_checks INTEGER;
    passed_checks INTEGER;
    compliance_score DECIMAL(3,2);
BEGIN
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN certification_status = 'compliant' THEN 1 END) as passed
    INTO total_checks, passed_checks
    FROM quality_compliance_checks
    WHERE inspection_id = p_inspection_id;

    IF total_checks > 0 THEN
        compliance_score := (passed_checks::DECIMAL / total_checks::DECIMAL);
    ELSE
        compliance_score := 1.0; -- Default to compliant if no specific checks
    END IF;

    RETURN compliance_score;
END;
$$ LANGUAGE plpgsql;

-- Create function to detect quality trend direction
CREATE OR REPLACE FUNCTION detect_trend_direction(
    p_project_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS TEXT AS $$
DECLARE
    recent_avg DECIMAL(5,2);
    previous_avg DECIMAL(5,2);
    trend_direction TEXT;
BEGIN
    -- Get recent average (last p_days/2 days)
    SELECT AVG(average_quality_score) INTO recent_avg
    FROM quality_trends
    WHERE project_id = p_project_id
    AND measurement_date >= CURRENT_DATE - (p_days/2)
    AND measurement_date < CURRENT_DATE;

    -- Get previous average (p_days/2 days before that)
    SELECT AVG(average_quality_score) INTO previous_avg
    FROM quality_trends
    WHERE project_id = p_project_id
    AND measurement_date >= CURRENT_DATE - p_days
    AND measurement_date < CURRENT_DATE - (p_days/2);

    -- Determine trend direction
    IF recent_avg IS NULL OR previous_avg IS NULL THEN
        trend_direction := 'stable';
    ELSIF recent_avg > previous_avg + 2 THEN
        trend_direction := 'improving';
    ELSIF recent_avg < previous_avg - 2 THEN
        trend_direction := 'declining';
    ELSE
        trend_direction := 'stable';
    END IF;

    RETURN trend_direction;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_plans ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (company-based access)
CREATE POLICY "Users can access project quality inspections" ON quality_inspections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = quality_inspections.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access project quality photos" ON quality_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = quality_photos.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access project quality defects" ON quality_defects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = quality_defects.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access quality standards" ON quality_standards
    FOR SELECT USING (true); -- Standards are public reference data

CREATE POLICY "Users can access quality annotations" ON quality_annotations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quality_photos qp
            JOIN projects p ON qp.project_id = p.id
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE qp.id = quality_annotations.photo_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access quality measurements" ON quality_measurements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = quality_measurements.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access compliance checks" ON quality_compliance_checks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quality_inspections qi
            JOIN projects p ON qi.project_id = p.id
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE qi.id = quality_compliance_checks.inspection_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access AI model versions" ON ai_model_versions
    FOR SELECT USING (true); -- Model info is public

CREATE POLICY "Users can access project quality trends" ON quality_trends
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = quality_trends.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access remediation plans" ON remediation_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quality_defects qd
            JOIN projects p ON qd.project_id = p.id
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE qd.id = remediation_plans.defect_id
            AND ur.user_id = auth.uid()
        )
    );

-- Insert sample quality standards
INSERT INTO quality_standards (standard_name, standard_version, category, requirements, applicable_trades) VALUES
('ACI 301', '2020', 'quality', '[
  {"requirement": "Surface tolerance ±1/4 inch in 10 feet", "critical": true},
  {"requirement": "Reinforcement placement ±1/2 inch", "critical": true},
  {"requirement": "Concrete strength minimum 3000 PSI", "critical": true}
]'::jsonb, ARRAY['concrete', 'structural']),

('OSHA 1926', '2023', 'safety', '[
  {"requirement": "Fall protection required above 6 feet", "critical": true},
  {"requirement": "Hard hats required in construction zones", "critical": true},
  {"requirement": "Proper scaffolding installation", "critical": true}
]'::jsonb, ARRAY['all']),

('IBC 2021', '2021', 'building_code', '[
  {"requirement": "Structural load requirements", "critical": true},
  {"requirement": "Fire safety compliance", "critical": true},
  {"requirement": "Accessibility requirements", "critical": false}
]'::jsonb, ARRAY['structural', 'architectural']),

('ASTM C94', '2021', 'quality', '[
  {"requirement": "Concrete mix design approval", "critical": true},
  {"requirement": "Slump test within specification", "critical": true},
  {"requirement": "Air content 4-8%", "critical": false}
]'::jsonb, ARRAY['concrete'])
ON CONFLICT (standard_name, standard_version, region) DO NOTHING;

-- Insert sample AI model versions
INSERT INTO ai_model_versions (model_name, version, model_type, accuracy_metrics) VALUES
('construction-defect-detector', 'v2.1', 'defect_detection', '{"precision": 0.92, "recall": 0.88, "f1_score": 0.90}'::jsonb),
('quality-assessment', 'v1.5', 'quality_assessment', '{"accuracy": 0.89, "confidence_threshold": 0.8}'::jsonb),
('measurement-extraction', 'v3.0', 'measurement', '{"accuracy": 0.94, "tolerance": 0.02}'::jsonb),
('object-detection', 'v2.3', 'object_detection', '{"mAP": 0.91, "inference_time_ms": 150}'::jsonb),
('compliance-checker', 'v1.2', 'compliance', '{"accuracy": 0.87, "false_positive_rate": 0.05}'::jsonb)
ON CONFLICT (model_name, version) DO NOTHING;
