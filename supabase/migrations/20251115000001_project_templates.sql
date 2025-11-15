-- Project Templates Table
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT,
  is_global BOOLEAN DEFAULT FALSE, -- Global templates available to all companies
  category TEXT, -- residential_remodel, commercial_build, etc.

  -- Template data (defaults for new projects)
  default_budget DECIMAL(15,2),
  default_duration_days INTEGER,
  budget_breakdown JSONB, -- { "materials": 40, "labor": 50, "overhead": 10 }
  milestones JSONB, -- [{ "name": "Foundation", "duration_days": 5, "order": 1 }]
  default_materials JSONB, -- [{ "name": "2x4 Lumber", "quantity": 100, "unit": "pieces" }]
  permit_checklist JSONB, -- ["Building Permit", "Electrical Permit"]

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  use_count INTEGER DEFAULT 0, -- Track template popularity
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_company_or_global CHECK (
    (company_id IS NOT NULL AND is_global = FALSE) OR
    (company_id IS NULL AND is_global = TRUE)
  )
);

-- Indexes
CREATE INDEX idx_project_templates_company ON project_templates(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_project_templates_global ON project_templates(is_global) WHERE is_global = TRUE;
CREATE INDEX idx_project_templates_category ON project_templates(category);
CREATE INDEX idx_project_templates_active ON project_templates(is_active) WHERE is_active = TRUE;

-- RLS Policies
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- Users can see global templates and their company's templates
CREATE POLICY "Users can view templates"
  ON project_templates
  FOR SELECT
  USING (
    is_global = TRUE OR
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Admins can create company templates
CREATE POLICY "Admins can create templates"
  ON project_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND company_id = project_templates.company_id
      AND role IN ('admin', 'root_admin')
    )
  );

-- Admins can update their company's templates
CREATE POLICY "Admins can update templates"
  ON project_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND company_id = project_templates.company_id
      AND role IN ('admin', 'root_admin')
    )
  );

-- Admins can delete their company's templates
CREATE POLICY "Admins can delete templates"
  ON project_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND company_id = project_templates.company_id
      AND role IN ('admin', 'root_admin')
    )
  );

-- Function to update use_count when template is used
CREATE OR REPLACE FUNCTION increment_template_use_count(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE project_templates
  SET use_count = use_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default global templates
INSERT INTO project_templates (name, description, project_type, is_global, category, default_budget, default_duration_days, budget_breakdown, milestones, default_materials, permit_checklist) VALUES
(
  'Kitchen Remodel - Standard',
  'Complete kitchen renovation including cabinets, countertops, appliances, and flooring',
  'residential_renovation',
  TRUE,
  'residential_remodel',
  25000,
  21,
  '{"materials": 45, "labor": 40, "overhead": 10, "permits": 5}'::jsonb,
  '[
    {"name": "Demolition", "duration_days": 2, "order": 1},
    {"name": "Rough Plumbing & Electrical", "duration_days": 3, "order": 2},
    {"name": "Drywall & Paint", "duration_days": 4, "order": 3},
    {"name": "Cabinet Installation", "duration_days": 3, "order": 4},
    {"name": "Countertop Installation", "duration_days": 2, "order": 5},
    {"name": "Flooring", "duration_days": 3, "order": 6},
    {"name": "Appliances & Fixtures", "duration_days": 2, "order": 7},
    {"name": "Final Inspection", "duration_days": 2, "order": 8}
  ]'::jsonb,
  '[
    {"name": "Cabinets", "quantity": 1, "unit": "set", "category": "materials"},
    {"name": "Countertops", "quantity": 25, "unit": "sq ft", "category": "materials"},
    {"name": "Flooring", "quantity": 150, "unit": "sq ft", "category": "materials"},
    {"name": "Appliances", "quantity": 1, "unit": "package", "category": "materials"}
  ]'::jsonb,
  '["Building Permit", "Electrical Permit", "Plumbing Permit"]'::jsonb
),
(
  'Bathroom Remodel - Full',
  'Full bathroom renovation with new fixtures, tile, and vanity',
  'residential_renovation',
  TRUE,
  'residential_remodel',
  15000,
  14,
  '{"materials": 50, "labor": 35, "overhead": 10, "permits": 5}'::jsonb,
  '[
    {"name": "Demolition", "duration_days": 1, "order": 1},
    {"name": "Rough Plumbing", "duration_days": 2, "order": 2},
    {"name": "Tile Work", "duration_days": 4, "order": 3},
    {"name": "Vanity & Fixtures", "duration_days": 2, "order": 4},
    {"name": "Paint & Finishing", "duration_days": 3, "order": 5},
    {"name": "Final Inspection", "duration_days": 2, "order": 6}
  ]'::jsonb,
  '[
    {"name": "Tile", "quantity": 100, "unit": "sq ft", "category": "materials"},
    {"name": "Vanity", "quantity": 1, "unit": "unit", "category": "fixtures"},
    {"name": "Toilet", "quantity": 1, "unit": "unit", "category": "fixtures"},
    {"name": "Shower/Tub", "quantity": 1, "unit": "unit", "category": "fixtures"}
  ]'::jsonb,
  '["Building Permit", "Plumbing Permit"]'::jsonb
),
(
  'Deck Construction - Wood',
  'New outdoor deck construction with pressure-treated lumber',
  'residential_new',
  TRUE,
  'outdoor',
  12000,
  10,
  '{"materials": 55, "labor": 35, "overhead": 10}'::jsonb,
  '[
    {"name": "Site Preparation", "duration_days": 1, "order": 1},
    {"name": "Foundation & Posts", "duration_days": 2, "order": 2},
    {"name": "Framing", "duration_days": 2, "order": 3},
    {"name": "Decking", "duration_days": 3, "order": 4},
    {"name": "Railing & Stairs", "duration_days": 2, "order": 5}
  ]'::jsonb,
  '[
    {"name": "Pressure-Treated 2x6", "quantity": 200, "unit": "board ft", "category": "lumber"},
    {"name": "Deck Boards", "quantity": 300, "unit": "board ft", "category": "lumber"},
    {"name": "Post Anchors", "quantity": 12, "unit": "units", "category": "hardware"},
    {"name": "Deck Screws", "quantity": 10, "unit": "lbs", "category": "hardware"}
  ]'::jsonb,
  '["Building Permit"]'::jsonb
),
(
  'Home Addition - Single Story',
  'Single-story home addition with foundation, framing, and finish work',
  'residential_new',
  TRUE,
  'addition',
  75000,
  90,
  '{"materials": 40, "labor": 45, "overhead": 10, "permits": 5}'::jsonb,
  '[
    {"name": "Site Prep & Foundation", "duration_days": 10, "order": 1},
    {"name": "Framing", "duration_days": 15, "order": 2},
    {"name": "Rough Plumbing & HVAC", "duration_days": 5, "order": 3},
    {"name": "Rough Electrical", "duration_days": 5, "order": 4},
    {"name": "Insulation", "duration_days": 3, "order": 5},
    {"name": "Drywall", "duration_days": 10, "order": 6},
    {"name": "Interior Trim", "duration_days": 8, "order": 7},
    {"name": "Flooring", "duration_days": 7, "order": 8},
    {"name": "Paint", "duration_days": 7, "order": 9},
    {"name": "Final Fixtures & Inspection", "duration_days": 20, "order": 10}
  ]'::jsonb,
  '[]'::jsonb,
  '["Building Permit", "Electrical Permit", "Plumbing Permit", "HVAC Permit"]'::jsonb
),
(
  'Basement Finishing',
  'Finish unfinished basement with walls, flooring, and lighting',
  'residential_renovation',
  TRUE,
  'residential_remodel',
  30000,
  30,
  '{"materials": 45, "labor": 40, "overhead": 10, "permits": 5}'::jsonb,
  '[
    {"name": "Framing", "duration_days": 5, "order": 1},
    {"name": "Electrical & Plumbing", "duration_days": 5, "order": 2},
    {"name": "Insulation", "duration_days": 2, "order": 3},
    {"name": "Drywall", "duration_days": 7, "order": 4},
    {"name": "Flooring", "duration_days": 5, "order": 5},
    {"name": "Paint & Trim", "duration_days": 4, "order": 6},
    {"name": "Final Inspection", "duration_days": 2, "order": 7}
  ]'::jsonb,
  '[]'::jsonb,
  '["Building Permit", "Electrical Permit"]'::jsonb
),
(
  'Commercial Tenant Improvement',
  'Office space tenant improvement with partitions and finishes',
  'commercial_renovation',
  TRUE,
  'commercial',
  50000,
  45,
  '{"materials": 35, "labor": 50, "overhead": 10, "permits": 5}'::jsonb,
  '[
    {"name": "Demolition", "duration_days": 3, "order": 1},
    {"name": "New Partitions", "duration_days": 7, "order": 2},
    {"name": "Electrical & Data", "duration_days": 7, "order": 3},
    {"name": "HVAC Modifications", "duration_days": 5, "order": 4},
    {"name": "Drywall & Paint", "duration_days": 10, "order": 5},
    {"name": "Flooring", "duration_days": 7, "order": 6},
    {"name": "Doors & Hardware", "duration_days": 3, "order": 7},
    {"name": "Final Inspection", "duration_days": 3, "order": 8}
  ]'::jsonb,
  '[]'::jsonb,
  '["Building Permit", "Electrical Permit", "Mechanical Permit"]'::jsonb
);

-- Add trigger to update updated_at
CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON project_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
