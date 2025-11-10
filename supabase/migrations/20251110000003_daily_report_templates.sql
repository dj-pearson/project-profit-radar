-- Migration: Daily Report Templates and Auto-population
-- Date: 2025-11-10
-- Purpose: Add template system and normalize daily report data for auto-population

-- =====================================================
-- 1. Enhance daily_reports Table
-- =====================================================

-- Add missing fields to support templates and better tracking
ALTER TABLE daily_reports
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS template_id UUID,
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS submission_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gps_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS weather_source TEXT,
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_day_plan TEXT,
ADD COLUMN IF NOT EXISTS quality_issues TEXT,
ADD COLUMN IF NOT EXISTS client_visitors TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS is_auto_populated BOOLEAN DEFAULT false;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_daily_reports_company
ON daily_reports(company_id);

CREATE INDEX IF NOT EXISTS idx_daily_reports_template
ON daily_reports(template_id);

CREATE INDEX IF NOT EXISTS idx_daily_reports_status
ON daily_reports(status);

CREATE INDEX IF NOT EXISTS idx_daily_reports_date
ON daily_reports(date DESC);

-- =====================================================
-- 2. Create Daily Report Templates Table
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Template Fields (NULL = user must fill, otherwise default value)
  default_crew_count INTEGER,
  default_weather_conditions TEXT,
  default_safety_notes TEXT,

  -- Template Flags
  include_crew_section BOOLEAN DEFAULT true,
  include_tasks_section BOOLEAN DEFAULT true,
  include_materials_section BOOLEAN DEFAULT true,
  include_equipment_section BOOLEAN DEFAULT true,
  include_safety_section BOOLEAN DEFAULT true,
  include_photos_section BOOLEAN DEFAULT true,

  -- Auto-population Settings
  auto_populate_crew BOOLEAN DEFAULT true,
  auto_populate_tasks BOOLEAN DEFAULT true,
  auto_populate_weather BOOLEAN DEFAULT true,
  auto_populate_materials BOOLEAN DEFAULT false,
  auto_populate_equipment BOOLEAN DEFAULT false,

  -- Template Metadata
  project_type TEXT,
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, name)
);

-- Add foreign key constraint to daily_reports
ALTER TABLE daily_reports
ADD CONSTRAINT fk_daily_reports_template
FOREIGN KEY (template_id)
REFERENCES daily_report_templates(id)
ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON daily_report_templates TO authenticated;

CREATE INDEX IF NOT EXISTS idx_daily_report_templates_company
ON daily_report_templates(company_id);

CREATE INDEX IF NOT EXISTS idx_daily_report_templates_active
ON daily_report_templates(is_active)
WHERE is_active = true;

-- =====================================================
-- 3. Create Normalized Daily Report Crew Table
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_report_crew_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(id),
  crew_member_name TEXT NOT NULL,
  role TEXT,
  hours_worked DOUBLE PRECISION DEFAULT 0,
  overtime_hours DOUBLE PRECISION DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(daily_report_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON daily_report_crew_items TO authenticated;

CREATE INDEX IF NOT EXISTS idx_daily_report_crew_items_report
ON daily_report_crew_items(daily_report_id);

CREATE INDEX IF NOT EXISTS idx_daily_report_crew_items_user
ON daily_report_crew_items(user_id);

-- =====================================================
-- 4. Create Normalized Daily Report Tasks Table
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_report_task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id),
  task_name TEXT NOT NULL,
  task_description TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(daily_report_id, task_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON daily_report_task_items TO authenticated;

CREATE INDEX IF NOT EXISTS idx_daily_report_task_items_report
ON daily_report_task_items(daily_report_id);

CREATE INDEX IF NOT EXISTS idx_daily_report_task_items_task
ON daily_report_task_items(task_id);

-- =====================================================
-- 5. Create Normalized Daily Report Materials Table
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_report_material_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE NOT NULL,
  material_name TEXT NOT NULL,
  quantity DOUBLE PRECISION,
  unit TEXT,
  supplier TEXT,
  cost DOUBLE PRECISION,
  waste_percentage DOUBLE PRECISION DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON daily_report_material_items TO authenticated;

CREATE INDEX IF NOT EXISTS idx_daily_report_material_items_report
ON daily_report_material_items(daily_report_id);

-- =====================================================
-- 6. Create Normalized Daily Report Equipment Table
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_report_equipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID,
  equipment_name TEXT NOT NULL,
  hours_used DOUBLE PRECISION DEFAULT 0,
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),
  fuel_used DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON daily_report_equipment_items TO authenticated;

CREATE INDEX IF NOT EXISTS idx_daily_report_equipment_items_report
ON daily_report_equipment_items(daily_report_id);

-- =====================================================
-- 7. Create Template Task Presets Table
-- =====================================================

CREATE TABLE IF NOT EXISTS template_task_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES daily_report_templates(id) ON DELETE CASCADE NOT NULL,
  task_name TEXT NOT NULL,
  task_description TEXT,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON template_task_presets TO authenticated;

CREATE INDEX IF NOT EXISTS idx_template_task_presets_template
ON template_task_presets(template_id);

-- =====================================================
-- 8. Function: Auto-populate Daily Report from Template
-- =====================================================

CREATE OR REPLACE FUNCTION auto_populate_daily_report(
  p_daily_report_id UUID,
  p_template_id UUID,
  p_project_id UUID,
  p_date DATE
)
RETURNS JSON AS $$
DECLARE
  v_template daily_report_templates%ROWTYPE;
  v_crew_count INTEGER := 0;
  v_task_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- Get template settings
  SELECT * INTO v_template
  FROM daily_report_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Template not found'
    );
  END IF;

  -- Auto-populate crew if enabled
  IF v_template.auto_populate_crew THEN
    INSERT INTO daily_report_crew_items (
      daily_report_id,
      user_id,
      crew_member_name,
      role,
      hours_worked
    )
    SELECT
      p_daily_report_id,
      ca.user_id,
      up.full_name,
      up.role,
      8.0 -- Default 8 hours
    FROM crew_assignments ca
    JOIN user_profiles up ON ca.user_id = up.id
    WHERE ca.project_id = p_project_id
      AND ca.assigned_date = p_date
      AND ca.status IN ('scheduled', 'dispatched', 'in_progress')
    ON CONFLICT (daily_report_id, user_id) DO NOTHING;

    GET DIAGNOSTICS v_crew_count = ROW_COUNT;
  END IF;

  -- Auto-populate tasks if enabled
  IF v_template.auto_populate_tasks THEN
    -- First, add template task presets
    INSERT INTO daily_report_task_items (
      daily_report_id,
      task_name,
      task_description,
      status,
      completion_percentage
    )
    SELECT
      p_daily_report_id,
      ttp.task_name,
      ttp.task_description,
      'not_started',
      0
    FROM template_task_presets ttp
    WHERE ttp.template_id = p_template_id
    ORDER BY ttp.display_order;

    -- Then, add scheduled project tasks
    INSERT INTO daily_report_task_items (
      daily_report_id,
      task_id,
      task_name,
      task_description,
      status,
      completion_percentage
    )
    SELECT
      p_daily_report_id,
      t.id,
      t.name,
      t.description,
      'in_progress',
      COALESCE(t.completion_percentage, 0)
    FROM tasks t
    WHERE t.project_id = p_project_id
      AND t.due_date = p_date
      AND t.status IN ('pending', 'in_progress')
    ON CONFLICT (daily_report_id, task_id) DO NOTHING;

    GET DIAGNOSTICS v_task_count = ROW_COUNT;
  END IF;

  -- Update daily report with auto-population flag
  UPDATE daily_reports
  SET is_auto_populated = true
  WHERE id = p_daily_report_id;

  -- Increment template use count
  UPDATE daily_report_templates
  SET use_count = use_count + 1
  WHERE id = p_template_id;

  RETURN json_build_object(
    'success', true,
    'crew_populated', v_crew_count,
    'tasks_populated', v_task_count,
    'template_name', v_template.name
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. View: Daily Reports with Details
-- =====================================================

CREATE OR REPLACE VIEW daily_reports_with_details AS
SELECT
  dr.id,
  dr.project_id,
  dr.date,
  dr.company_id,
  dr.template_id,
  dr.status,
  dr.completion_percentage,
  dr.weather_conditions,
  dr.temperature,
  dr.work_performed,
  dr.delays_issues,
  dr.safety_incidents,
  dr.next_day_plan,
  dr.quality_issues,
  dr.gps_latitude,
  dr.gps_longitude,
  dr.submitted_by,
  dr.submission_timestamp,
  dr.created_at,

  -- Project info
  p.name as project_name,
  p.location as project_location,

  -- Template info
  drt.name as template_name,

  -- Submitted by info
  up.full_name as submitted_by_name,

  -- Crew count from normalized table
  (SELECT COUNT(*) FROM daily_report_crew_items WHERE daily_report_id = dr.id) as crew_count,

  -- Task count from normalized table
  (SELECT COUNT(*) FROM daily_report_task_items WHERE daily_report_id = dr.id) as task_count,

  -- Completed task percentage
  (
    SELECT COALESCE(AVG(completion_percentage), 0)
    FROM daily_report_task_items
    WHERE daily_report_id = dr.id
  ) as avg_task_completion

FROM daily_reports dr
LEFT JOIN projects p ON dr.project_id = p.id
LEFT JOIN daily_report_templates drt ON dr.template_id = drt.id
LEFT JOIN user_profiles up ON dr.submitted_by = up.id;

GRANT SELECT ON daily_reports_with_details TO authenticated;

-- =====================================================
-- 10. View: Today's Scheduled Tasks for Auto-population
-- =====================================================

CREATE OR REPLACE VIEW todays_scheduled_tasks AS
SELECT
  t.id as task_id,
  t.project_id,
  t.name as task_name,
  t.description as task_description,
  t.status,
  t.completion_percentage,
  t.due_date,
  p.name as project_name
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.due_date = CURRENT_DATE
  AND t.status IN ('pending', 'in_progress')
ORDER BY t.project_id, t.name;

GRANT SELECT ON todays_scheduled_tasks TO authenticated;

-- =====================================================
-- 11. RLS Policies
-- =====================================================

-- Daily report templates
ALTER TABLE daily_report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company templates"
  ON daily_report_templates FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage templates"
  ON daily_report_templates FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'project_manager')
    )
  );

-- Crew items
ALTER TABLE daily_report_crew_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view crew items for company reports"
  ON daily_report_crew_items FOR SELECT
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage crew items for their reports"
  ON daily_report_crew_items FOR ALL
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.created_by = auth.uid()
    )
  );

-- Task items (similar policies for other normalized tables)
ALTER TABLE daily_report_task_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task items for company reports"
  ON daily_report_task_items FOR SELECT
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage task items for their reports"
  ON daily_report_task_items FOR ALL
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.created_by = auth.uid()
    )
  );

-- Material items
ALTER TABLE daily_report_material_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view material items for company reports"
  ON daily_report_material_items FOR SELECT
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage material items for their reports"
  ON daily_report_material_items FOR ALL
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.created_by = auth.uid()
    )
  );

-- Equipment items
ALTER TABLE daily_report_equipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view equipment items for company reports"
  ON daily_report_equipment_items FOR SELECT
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage equipment items for their reports"
  ON daily_report_equipment_items FOR ALL
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.created_by = auth.uid()
    )
  );

-- Template task presets
ALTER TABLE template_task_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template task presets"
  ON template_task_presets FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM daily_report_templates
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage template task presets"
  ON template_task_presets FOR ALL
  USING (
    template_id IN (
      SELECT id FROM daily_report_templates
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
        AND role IN ('admin', 'project_manager')
      )
    )
  );

-- =====================================================
-- 12. Comments for Documentation
-- =====================================================

COMMENT ON TABLE daily_report_templates IS 'Reusable templates for daily reports with auto-population settings';
COMMENT ON TABLE daily_report_crew_items IS 'Normalized crew member details for each daily report';
COMMENT ON TABLE daily_report_task_items IS 'Normalized task progress for each daily report';
COMMENT ON TABLE daily_report_material_items IS 'Normalized material usage for each daily report';
COMMENT ON TABLE daily_report_equipment_items IS 'Normalized equipment usage for each daily report';
COMMENT ON TABLE template_task_presets IS 'Pre-defined task lists for daily report templates';

COMMENT ON FUNCTION auto_populate_daily_report IS 'Automatically populates daily report with crew, tasks, and other data based on template settings';

COMMENT ON VIEW daily_reports_with_details IS 'Complete daily report data with joined project, template, and statistics';
COMMENT ON VIEW todays_scheduled_tasks IS 'Tasks scheduled for today across all projects for auto-population';
