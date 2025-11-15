-- Estimate Templates Table
CREATE TABLE IF NOT EXISTS estimate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  category TEXT, -- kitchen, bathroom, deck, addition, custom, etc.

  -- Template defaults
  default_title TEXT,
  default_markup_percentage DECIMAL(5,2) DEFAULT 20,
  default_tax_percentage DECIMAL(5,2) DEFAULT 0,
  default_terms_and_conditions TEXT,
  valid_days INTEGER DEFAULT 30, -- How many days estimate is valid

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  use_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_company_or_global CHECK (
    (company_id IS NOT NULL AND is_global = FALSE) OR
    (company_id IS NULL AND is_global = TRUE)
  )
);

-- Template Line Items (line items that belong to templates)
CREATE TABLE IF NOT EXISTS estimate_template_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES estimate_templates(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'each',
  unit_cost DECIMAL(10,2),
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Line Item Library (reusable individual line items)
CREATE TABLE IF NOT EXISTS line_item_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT FALSE,

  -- Line item details
  item_name TEXT NOT NULL,
  description TEXT,
  default_quantity DECIMAL(10,2) DEFAULT 1,
  default_unit TEXT DEFAULT 'each',
  default_unit_cost DECIMAL(10,2),
  category TEXT, -- framing, electrical, plumbing, finishing, etc.

  -- Cost breakdown (optional detailed costing)
  labor_cost DECIMAL(10,2),
  material_cost DECIMAL(10,2),
  equipment_cost DECIMAL(10,2),

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_library_company_or_global CHECK (
    (company_id IS NOT NULL AND is_global = FALSE) OR
    (company_id IS NULL AND is_global = TRUE)
  )
);

-- Indexes
CREATE INDEX idx_estimate_templates_company ON estimate_templates(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_estimate_templates_global ON estimate_templates(is_global) WHERE is_global = TRUE;
CREATE INDEX idx_estimate_templates_category ON estimate_templates(category);
CREATE INDEX idx_estimate_templates_active ON estimate_templates(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_template_line_items_template ON estimate_template_line_items(template_id);
CREATE INDEX idx_template_line_items_sort ON estimate_template_line_items(template_id, sort_order);

CREATE INDEX idx_line_item_library_company ON line_item_library(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_line_item_library_global ON line_item_library(is_global) WHERE is_global = TRUE;
CREATE INDEX idx_line_item_library_category ON line_item_library(category);
CREATE INDEX idx_line_item_library_active ON line_item_library(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_line_item_library_name ON line_item_library USING gin(to_tsvector('english', item_name || ' ' || COALESCE(description, '')));

-- RLS Policies for Estimate Templates
ALTER TABLE estimate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_template_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_item_library ENABLE ROW LEVEL SECURITY;

-- Users can see global templates and their company's templates
CREATE POLICY "Users can view estimate templates"
  ON estimate_templates
  FOR SELECT
  USING (
    is_global = TRUE OR
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view template line items"
  ON estimate_template_line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM estimate_templates
      WHERE id = template_id
      AND (is_global = TRUE OR company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can view line item library"
  ON line_item_library
  FOR SELECT
  USING (
    is_global = TRUE OR
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Admins can create/update/delete templates and library items
CREATE POLICY "Admins can manage estimate templates"
  ON estimate_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND company_id = estimate_templates.company_id
      AND role IN ('admin', 'root_admin')
    )
  );

CREATE POLICY "Admins can manage template line items"
  ON estimate_template_line_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM estimate_templates t
      JOIN user_profiles up ON up.company_id = t.company_id
      WHERE t.id = template_id
      AND up.id = auth.uid()
      AND up.role IN ('admin', 'root_admin')
    )
  );

CREATE POLICY "Admins can manage line item library"
  ON line_item_library
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND company_id = line_item_library.company_id
      AND role IN ('admin', 'root_admin')
    )
  );

-- Functions
CREATE OR REPLACE FUNCTION increment_estimate_template_use_count(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE estimate_templates
  SET use_count = use_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_line_item_use_count(item_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE line_item_library
  SET use_count = use_count + 1,
      last_used_at = now()
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER update_estimate_templates_updated_at
  BEFORE UPDATE ON estimate_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_item_library_updated_at
  BEFORE UPDATE ON line_item_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert global estimate templates
INSERT INTO estimate_templates (name, description, is_global, category, default_title, default_markup_percentage, default_tax_percentage, default_terms_and_conditions, valid_days) VALUES
(
  'Kitchen Remodel - Standard',
  'Complete kitchen renovation estimate template',
  TRUE,
  'kitchen',
  'Kitchen Renovation Estimate',
  20,
  0,
  'Payment terms: 50% deposit, 25% at midpoint, 25% upon completion. Estimate valid for 30 days. Work to be completed within timeline specified. Any changes to scope will require change order.',
  30
),
(
  'Bathroom Remodel - Full',
  'Full bathroom renovation with fixtures and tile',
  TRUE,
  'bathroom',
  'Bathroom Renovation Estimate',
  20,
  0,
  'Payment terms: 50% deposit, 50% upon completion. Estimate valid for 30 days. Includes all labor and materials specified. Permits not included.',
  30
),
(
  'Deck Construction',
  'New deck construction estimate',
  TRUE,
  'outdoor',
  'Deck Construction Estimate',
  15,
  0,
  'Payment terms: 40% deposit, 30% at framing completion, 30% upon final completion. Estimate valid for 30 days.',
  30
),
(
  'Home Addition',
  'Home addition construction estimate',
  TRUE,
  'addition',
  'Home Addition Estimate',
  18,
  0,
  'Payment terms: Schedule of values billing monthly. Estimate valid for 60 days. Subject to change based on final engineering.',
  60
);

-- Get template IDs for inserting line items
DO $$
DECLARE
  kitchen_template_id UUID;
  bathroom_template_id UUID;
  deck_template_id UUID;
  addition_template_id UUID;
BEGIN
  SELECT id INTO kitchen_template_id FROM estimate_templates WHERE name = 'Kitchen Remodel - Standard' AND is_global = TRUE;
  SELECT id INTO bathroom_template_id FROM estimate_templates WHERE name = 'Bathroom Remodel - Full' AND is_global = TRUE;
  SELECT id INTO deck_template_id FROM estimate_templates WHERE name = 'Deck Construction' AND is_global = TRUE;
  SELECT id INTO addition_template_id FROM estimate_templates WHERE name = 'Home Addition' AND is_global = TRUE;

  -- Kitchen template line items
  INSERT INTO estimate_template_line_items (template_id, item_name, description, quantity, unit, unit_cost, category, sort_order) VALUES
  (kitchen_template_id, 'Demolition', 'Remove existing cabinets, countertops, and appliances', 1, 'lot', 1500, 'demolition', 1),
  (kitchen_template_id, 'Custom Cabinets', 'Semi-custom cabinet set with soft-close doors', 1, 'set', 8000, 'cabinets', 2),
  (kitchen_template_id, 'Granite Countertops', 'Level 2 granite with undermount sink cutout', 25, 'sq ft', 65, 'countertops', 3),
  (kitchen_template_id, 'Tile Backsplash', 'Subway tile backsplash installation', 40, 'sq ft', 18, 'tile', 4),
  (kitchen_template_id, 'Flooring', 'Luxury vinyl plank flooring', 150, 'sq ft', 8, 'flooring', 5),
  (kitchen_template_id, 'Plumbing Rough-in', 'Relocate plumbing as needed', 1, 'lot', 1200, 'plumbing', 6),
  (kitchen_template_id, 'Electrical Work', 'New outlets, under-cabinet lighting, pendant lights', 1, 'lot', 1800, 'electrical', 7),
  (kitchen_template_id, 'Painting', 'Prime and paint walls and ceiling', 200, 'sq ft', 2.5, 'painting', 8),
  (kitchen_template_id, 'Appliance Installation', 'Install customer-supplied appliances', 1, 'lot', 400, 'installation', 9);

  -- Bathroom template line items
  INSERT INTO estimate_template_line_items (template_id, item_name, description, quantity, unit, unit_cost, category, sort_order) VALUES
  (bathroom_template_id, 'Demolition', 'Remove existing fixtures, tile, and vanity', 1, 'lot', 800, 'demolition', 1),
  (bathroom_template_id, 'Vanity', '48" vanity with quartz top', 1, 'each', 1200, 'fixtures', 2),
  (bathroom_template_id, 'Toilet', 'Dual-flush elongated toilet', 1, 'each', 350, 'fixtures', 3),
  (bathroom_template_id, 'Shower/Tub', 'Acrylic tub/shower combo', 1, 'each', 800, 'fixtures', 4),
  (bathroom_template_id, 'Tile Work - Floor', 'Porcelain floor tile installation', 50, 'sq ft', 12, 'tile', 5),
  (bathroom_template_id, 'Tile Work - Walls', 'Ceramic wall tile in shower area', 80, 'sq ft', 10, 'tile', 6),
  (bathroom_template_id, 'Plumbing', 'Rough and finish plumbing', 1, 'lot', 1500, 'plumbing', 7),
  (bathroom_template_id, 'Electrical', 'Fan, lights, GFCI outlets', 1, 'lot', 600, 'electrical', 8),
  (bathroom_template_id, 'Painting', 'Prime and paint', 100, 'sq ft', 2.5, 'painting', 9);

  -- Deck template line items
  INSERT INTO estimate_template_line_items (template_id, item_name, description, quantity, unit, unit_cost, category, sort_order) VALUES
  (deck_template_id, 'Framing Lumber', 'Pressure-treated 2x8 joists and beams', 800, 'board ft', 1.2, 'lumber', 1),
  (deck_template_id, 'Decking Boards', 'Composite decking boards', 400, 'sq ft', 6.5, 'decking', 2),
  (deck_template_id, 'Railing System', 'Composite railing with aluminum balusters', 60, 'lin ft', 45, 'railing', 3),
  (deck_template_id, 'Post Footings', 'Concrete pier footings', 8, 'each', 75, 'foundation', 4),
  (deck_template_id, 'Hardware & Fasteners', 'Deck screws, joist hangers, post bases', 1, 'lot', 300, 'hardware', 5),
  (deck_template_id, 'Stairs', 'Deck stairs with railings', 1, 'set', 800, 'stairs', 6),
  (deck_template_id, 'Labor - Framing', 'Deck framing labor', 24, 'hour', 65, 'labor', 7),
  (deck_template_id, 'Labor - Decking/Railing', 'Decking and railing installation labor', 16, 'hour', 65, 'labor', 8);

  -- Addition template line items
  INSERT INTO estimate_template_line_items (template_id, item_name, description, quantity, unit, unit_cost, category, sort_order) VALUES
  (addition_template_id, 'Foundation', 'Concrete foundation and footing', 1, 'lot', 8000, 'foundation', 1),
  (addition_template_id, 'Framing', 'Wall and roof framing lumber and labor', 1, 'lot', 12000, 'framing', 2),
  (addition_template_id, 'Roofing', 'Shingles, underlayment, and installation', 400, 'sq ft', 6, 'roofing', 3),
  (addition_template_id, 'Windows', '3 standard double-hung windows', 3, 'each', 650, 'windows', 4),
  (addition_template_id, 'Exterior Door', 'Entry door with installation', 1, 'each', 1200, 'doors', 5),
  (addition_template_id, 'Siding', 'Match existing siding', 600, 'sq ft', 8, 'siding', 6),
  (addition_template_id, 'Insulation', 'R-19 wall, R-38 ceiling', 1, 'lot', 1500, 'insulation', 7),
  (addition_template_id, 'Drywall', 'Hang, tape, and finish', 800, 'sq ft', 2.5, 'drywall', 8),
  (addition_template_id, 'Electrical - Rough', 'Rough electrical', 1, 'lot', 2000, 'electrical', 9),
  (addition_template_id, 'Plumbing - Rough', 'Rough plumbing if needed', 1, 'lot', 2500, 'plumbing', 10),
  (addition_template_id, 'HVAC Extension', 'Extend HVAC system', 1, 'lot', 3000, 'hvac', 11),
  (addition_template_id, 'Flooring', 'Hardwood or carpet', 300, 'sq ft', 10, 'flooring', 12),
  (addition_template_id, 'Interior Trim', 'Baseboard, casing, doors', 1, 'lot', 2000, 'trim', 13),
  (addition_template_id, 'Painting - Interior', 'Prime and paint all surfaces', 1600, 'sq ft', 2, 'painting', 14);
END $$;

-- Insert global line item library entries
INSERT INTO line_item_library (is_global, item_name, description, default_quantity, default_unit, default_unit_cost, category, labor_cost, material_cost) VALUES
-- Framing
(TRUE, '2x4 Stud - 8ft', 'Kiln-dried framing stud', 1, 'each', 4.50, 'framing', 0, 4.50),
(TRUE, '2x6 Stud - 8ft', 'Kiln-dried framing stud', 1, 'each', 7, 'framing', 0, 7),
(TRUE, '2x8 Joist - 12ft', 'Pressure-treated joist', 1, 'each', 18, 'framing', 0, 18),
(TRUE, 'Framing Labor', 'Carpenter framing labor', 1, 'hour', 65, 'labor', 65, 0),

-- Drywall
(TRUE, 'Drywall 1/2" - 4x8', 'Standard drywall sheet', 1, 'sheet', 12, 'drywall', 0, 12),
(TRUE, 'Drywall Installation', 'Hang, tape, mud, sand', 1, 'sq ft', 2.50, 'drywall', 2, 0.50),

-- Electrical
(TRUE, 'Electrical Outlet', 'Install standard outlet', 1, 'each', 85, 'electrical', 65, 20),
(TRUE, 'Light Fixture Installation', 'Install customer-supplied fixture', 1, 'each', 95, 'electrical', 75, 20),
(TRUE, 'Ceiling Fan Installation', 'Install ceiling fan with light', 1, 'each', 150, 'electrical', 120, 30),

-- Plumbing
(TRUE, 'Toilet Installation', 'Install customer-supplied toilet', 1, 'each', 200, 'plumbing', 150, 50),
(TRUE, 'Sink Faucet Installation', 'Install faucet and drain', 1, 'each', 180, 'plumbing', 130, 50),
(TRUE, 'Shower Valve Installation', 'Rough and finish shower valve', 1, 'each', 350, 'plumbing', 250, 100),

-- Flooring
(TRUE, 'Hardwood Flooring', 'Installation of engineered hardwood', 1, 'sq ft', 12, 'flooring', 4, 8),
(TRUE, 'Vinyl Plank Flooring', 'LVP installation with underlayment', 1, 'sq ft', 8, 'flooring', 3, 5),
(TRUE, 'Tile Flooring', 'Ceramic tile with thin-set', 1, 'sq ft', 12, 'flooring', 6, 6),

-- Painting
(TRUE, 'Interior Painting', 'Prime and 2 coats paint', 1, 'sq ft', 2.50, 'painting', 1.50, 1),
(TRUE, 'Exterior Painting', 'Prime and 2 coats exterior paint', 1, 'sq ft', 3.50, 'painting', 2, 1.50),

-- Cabinets
(TRUE, 'Base Cabinet - 24"', 'Standard base cabinet', 1, 'each', 400, 'cabinets', 0, 400),
(TRUE, 'Wall Cabinet - 30"', 'Standard wall cabinet', 1, 'each', 350, 'cabinets', 0, 350),
(TRUE, 'Cabinet Installation', 'Per linear foot cabinet install', 1, 'lin ft', 75, 'labor', 75, 0);
