-- Smart Material Orchestration System Database Schema

-- Create materials table if it doesn't exist
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'each',
  unit_cost DECIMAL(10,2) DEFAULT 0,
  category TEXT,
  storage_requirements JSONB DEFAULT '[]'::jsonb,
  reorder_point INTEGER DEFAULT 0,
  minimum_stock_level INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create suppliers table if it doesn't exist
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  reliability_score DECIMAL(3,2) DEFAULT 0.70,
  payment_terms TEXT DEFAULT 'Net 30',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create material_suppliers junction table
CREATE TABLE IF NOT EXISTS material_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  unit_price DECIMAL(10,2) NOT NULL,
  lead_time_days INTEGER DEFAULT 7,
  minimum_order_quantity INTEGER DEFAULT 1,
  maximum_order_quantity INTEGER,
  availability_status TEXT DEFAULT 'available',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(material_id, supplier_id)
);

-- Create material_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS material_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  quantity_needed INTEGER NOT NULL DEFAULT 0,
  quantity_used INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity_used * unit_cost) STORED,
  usage_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create delivery_plans table for optimal delivery scheduling
CREATE TABLE IF NOT EXISTS delivery_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  quantity_needed INTEGER NOT NULL,
  optimal_delivery_date DATE NOT NULL,
  delivery_window_start TIME DEFAULT '08:00',
  delivery_window_end TIME DEFAULT '16:00',
  storage_location TEXT,
  delivery_priority TEXT DEFAULT 'medium' CHECK (delivery_priority IN ('low', 'medium', 'high', 'critical')),
  delivery_status TEXT DEFAULT 'planned' CHECK (delivery_status IN ('planned', 'scheduled', 'in_transit', 'delivered', 'delayed')),
  cost_optimization JSONB DEFAULT '{}'::jsonb,
  alternative_dates DATE[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create material_shortages table for tracking detected shortages
CREATE TABLE IF NOT EXISTS material_shortages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  required_quantity INTEGER NOT NULL,
  available_quantity INTEGER DEFAULT 0,
  shortage_amount INTEGER GENERATED ALWAYS AS (required_quantity - available_quantity) STORED,
  needed_by_date DATE NOT NULL,
  urgency_level TEXT DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  affected_tasks UUID[] DEFAULT '{}',
  suggested_suppliers JSONB DEFAULT '[]'::jsonb,
  resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'cancelled')),
  resolution_notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cross_project_transfers table for inventory optimization
CREATE TABLE IF NOT EXISTS cross_project_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  to_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  transfer_cost DECIMAL(10,2) DEFAULT 0,
  estimated_savings DECIMAL(10,2) DEFAULT 0,
  transfer_date DATE NOT NULL,
  transfer_status TEXT DEFAULT 'proposed' CHECK (transfer_status IN ('proposed', 'approved', 'in_transit', 'completed', 'cancelled')),
  approval_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchase_orders table for automated PO generation
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_date DATE NOT NULL,
  order_status TEXT DEFAULT 'draft' CHECK (order_status IN ('draft', 'pending', 'approved', 'ordered', 'delivered', 'cancelled')),
  auto_generated BOOLEAN DEFAULT false,
  payment_terms TEXT DEFAULT 'Net 30',
  delivery_instructions TEXT,
  special_requirements TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  ordered_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  delivery_date DATE,
  received_quantity INTEGER DEFAULT 0,
  item_status TEXT DEFAULT 'ordered' CHECK (item_status IN ('ordered', 'partial', 'delivered', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create material_predictions table for usage forecasting
CREATE TABLE IF NOT EXISTS material_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  predicted_usage DECIMAL(10,2) NOT NULL,
  confidence_level DECIMAL(3,2) DEFAULT 0.5,
  usage_pattern TEXT DEFAULT 'steady' CHECK (usage_pattern IN ('steady', 'increasing', 'decreasing', 'seasonal')),
  recommended_stock_level DECIMAL(10,2) DEFAULT 0,
  reorder_point DECIMAL(10,2) DEFAULT 0,
  prediction_date DATE DEFAULT CURRENT_DATE,
  model_version TEXT DEFAULT 'v1.0',
  historical_data_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(material_id, project_id, prediction_date)
);

-- Create consolidation_opportunities table
CREATE TABLE IF NOT EXISTS consolidation_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_type TEXT NOT NULL,
  projects_involved UUID[] NOT NULL,
  combined_quantity INTEGER NOT NULL,
  individual_orders_cost DECIMAL(12,2) NOT NULL,
  consolidated_cost DECIMAL(12,2) NOT NULL,
  savings_amount DECIMAL(12,2) GENERATED ALWAYS AS (individual_orders_cost - consolidated_cost) STORED,
  optimal_delivery_date DATE NOT NULL,
  opportunity_status TEXT DEFAULT 'identified' CHECK (opportunity_status IN ('identified', 'approved', 'consolidated', 'cancelled')),
  approval_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  consolidated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_material_usage_project_material ON material_usage(project_id, material_id);
CREATE INDEX IF NOT EXISTS idx_delivery_plans_project_date ON delivery_plans(project_id, optimal_delivery_date);
CREATE INDEX IF NOT EXISTS idx_material_shortages_urgency ON material_shortages(urgency_level, needed_by_date);
CREATE INDEX IF NOT EXISTS idx_cross_project_transfers_status ON cross_project_transfers(transfer_status, transfer_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_date ON purchase_orders(order_status, delivery_date);
CREATE INDEX IF NOT EXISTS idx_material_predictions_material ON material_predictions(material_id, prediction_date);
CREATE INDEX IF NOT EXISTS idx_material_suppliers_material ON material_suppliers(material_id, unit_price);

-- Create function to generate PO numbers
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    po_number TEXT;
BEGIN
    -- Get the next sequence number
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 'PO-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM purchase_orders
    WHERE po_number ~ '^PO-\d+$';
    
    -- Format as PO-YYYYMMDD-XXX
    po_number := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN po_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate PO numbers
CREATE OR REPLACE FUNCTION set_po_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
        NEW.po_number := generate_po_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_po_number
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_po_number();

-- Create function to update material predictions
CREATE OR REPLACE FUNCTION update_material_predictions()
RETURNS TRIGGER AS $$
BEGIN
    -- Update predictions when material usage changes
    INSERT INTO material_predictions (
        material_id,
        project_id,
        predicted_usage,
        confidence_level,
        historical_data_points
    )
    SELECT 
        NEW.material_id,
        NEW.project_id,
        AVG(quantity_used)::DECIMAL(10,2),
        LEAST(0.9, COUNT(*)::DECIMAL / 10),
        COUNT(*)
    FROM material_usage
    WHERE material_id = NEW.material_id
    AND project_id = NEW.project_id
    AND quantity_used > 0
    GROUP BY material_id, project_id
    ON CONFLICT (material_id, project_id, prediction_date)
    DO UPDATE SET
        predicted_usage = EXCLUDED.predicted_usage,
        confidence_level = EXCLUDED.confidence_level,
        historical_data_points = EXCLUDED.historical_data_points,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_material_predictions
    AFTER INSERT OR UPDATE OF quantity_used ON material_usage
    FOR EACH ROW
    WHEN (NEW.quantity_used IS NOT NULL AND NEW.quantity_used > 0)
    EXECUTE FUNCTION update_material_predictions();

-- Create function to detect material shortages
CREATE OR REPLACE FUNCTION detect_material_shortages()
RETURNS TRIGGER AS $$
DECLARE
    shortage_record RECORD;
BEGIN
    -- Check for potential shortages when tasks are created or updated
    FOR shortage_record IN
        SELECT 
            t.project_id,
            mu.material_id,
            SUM(mu.quantity_needed) as total_needed,
            COALESCE(SUM(mu.quantity_used), 0) as total_available,
            MIN(t.start_date) as earliest_needed
        FROM tasks t
        JOIN material_usage mu ON t.id = mu.task_id
        WHERE t.project_id = NEW.project_id
        AND t.start_date >= CURRENT_DATE
        AND t.status != 'completed'
        GROUP BY t.project_id, mu.material_id
        HAVING SUM(mu.quantity_needed) > COALESCE(SUM(mu.quantity_used), 0)
    LOOP
        INSERT INTO material_shortages (
            project_id,
            material_id,
            required_quantity,
            available_quantity,
            needed_by_date,
            urgency_level
        ) VALUES (
            shortage_record.project_id,
            shortage_record.material_id,
            shortage_record.total_needed,
            shortage_record.total_available,
            shortage_record.earliest_needed,
            CASE 
                WHEN shortage_record.earliest_needed <= CURRENT_DATE + INTERVAL '3 days' THEN 'critical'
                WHEN shortage_record.earliest_needed <= CURRENT_DATE + INTERVAL '7 days' THEN 'high'
                WHEN shortage_record.earliest_needed <= CURRENT_DATE + INTERVAL '14 days' THEN 'medium'
                ELSE 'low'
            END
        )
        ON CONFLICT (project_id, material_id, needed_by_date)
        DO UPDATE SET
            required_quantity = EXCLUDED.required_quantity,
            available_quantity = EXCLUDED.available_quantity,
            urgency_level = EXCLUDED.urgency_level,
            updated_at = NOW();
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would be resource-intensive, so we'll make it optional
-- CREATE TRIGGER trigger_detect_material_shortages
--     AFTER INSERT OR UPDATE ON tasks
--     FOR EACH ROW
--     EXECUTE FUNCTION detect_material_shortages();

-- Create RLS policies
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_shortages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_project_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consolidation_opportunities ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (company-based access)
CREATE POLICY "Users can access company materials" ON materials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access company suppliers" ON suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access material suppliers" ON material_suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access project material usage" ON material_usage
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = material_usage.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access project delivery plans" ON delivery_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = delivery_plans.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access project material shortages" ON material_shortages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = material_shortages.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access company transfers" ON cross_project_transfers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p1
            JOIN projects p2 ON p1.company_id = p2.company_id
            JOIN user_roles ur ON p1.company_id = ur.company_id
            WHERE (p1.id = cross_project_transfers.from_project_id OR p1.id = cross_project_transfers.to_project_id)
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access project purchase orders" ON purchase_orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = purchase_orders.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access purchase order items" ON purchase_order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM purchase_orders po
            JOIN projects p ON po.project_id = p.id
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE po.id = purchase_order_items.purchase_order_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access material predictions" ON material_predictions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = material_predictions.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access consolidation opportunities" ON consolidation_opportunities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
        )
    );

-- Create some sample data for testing
INSERT INTO materials (name, description, unit, unit_cost, category, storage_requirements) VALUES
('Concrete Mix', '3000 PSI Ready Mix Concrete', 'cubic_yard', 120.00, 'concrete', '["covered"]'),
('Rebar #4', '1/2 inch Steel Reinforcement Bar', 'foot', 0.85, 'steel', '["dry"]'),
('2x4 Lumber', 'Pressure Treated 2x4x8 Lumber', 'piece', 8.50, 'lumber', '["covered", "dry"]'),
('Roofing Shingles', 'Architectural Asphalt Shingles', 'bundle', 35.00, 'roofing', '["covered", "dry"]'),
('Drywall', '1/2 inch Gypsum Board 4x8', 'sheet', 12.00, 'drywall', '["covered", "dry"]')
ON CONFLICT (name) DO NOTHING;

INSERT INTO suppliers (name, contact_email, contact_phone, reliability_score) VALUES
('ABC Building Supply', 'orders@abcbuilding.com', '555-0101', 0.92),
('Metro Concrete Co', 'dispatch@metroconcrete.com', '555-0102', 0.88),
('Superior Steel', 'sales@superiorsteel.com', '555-0103', 0.95),
('Quality Lumber Yard', 'info@qualitylumber.com', '555-0104', 0.85),
('Roofing Materials Plus', 'orders@roofingplus.com', '555-0105', 0.90)
ON CONFLICT (name) DO NOTHING;
