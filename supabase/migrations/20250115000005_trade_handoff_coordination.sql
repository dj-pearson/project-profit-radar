-- Trade Handoff Coordination System Database Schema

-- Create trades table if it doesn't exist
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT, -- 'structural', 'mechanical', 'electrical', 'finishing', etc.
  typical_duration_days INTEGER DEFAULT 7,
  requires_inspection BOOLEAN DEFAULT false,
  safety_requirements JSONB DEFAULT '[]'::jsonb,
  skill_level_required TEXT DEFAULT 'intermediate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trade_handoffs table for managing handoff sequences
CREATE TABLE IF NOT EXISTS trade_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  from_trade TEXT NOT NULL,
  to_trade TEXT NOT NULL,
  handoff_type TEXT DEFAULT 'sequential' CHECK (handoff_type IN ('sequential', 'overlap', 'parallel')),
  dependencies TEXT[] DEFAULT '{}',
  completion_criteria JSONB DEFAULT '[]'::jsonb,
  estimated_handoff_time INTEGER DEFAULT 4, -- hours
  buffer_time INTEGER DEFAULT 2, -- hours
  critical_path BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'in_progress', 'completed', 'delayed', 'blocked')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  estimated_completion TIMESTAMPTZ,
  actual_completion TIMESTAMPTZ,
  delay_reasons TEXT[] DEFAULT '{}',
  blocking_issues JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quality_checks table for handoff quality control
CREATE TABLE IF NOT EXISTS quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id UUID REFERENCES trade_handoffs(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL,
  description TEXT NOT NULL,
  responsible_party TEXT DEFAULT 'inspector' CHECK (responsible_party IN ('outgoing_trade', 'incoming_trade', 'inspector')),
  required BOOLEAN DEFAULT true,
  completion_photo_required BOOLEAN DEFAULT false,
  sign_off_required BOOLEAN DEFAULT false,
  passed BOOLEAN,
  notes TEXT,
  photo_url TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(handoff_id, check_id)
);

-- Create trade_coordination_meetings table
CREATE TABLE IF NOT EXISTS trade_coordination_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  coordination_type TEXT DEFAULT 'daily_standup' CHECK (coordination_type IN ('daily_standup', 'weekly_planning', 'issue_resolution', 'handoff_meeting')),
  coordination_date TIMESTAMPTZ NOT NULL,
  trades_involved TEXT[] NOT NULL,
  agenda_items JSONB DEFAULT '[]'::jsonb,
  decisions_made JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  meeting_notes TEXT,
  next_meeting_date TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  meeting_duration INTEGER, -- minutes
  attendance_rate DECIMAL(3,2), -- percentage
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conflict_resolutions table
CREATE TABLE IF NOT EXISTS conflict_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  conflict_id TEXT UNIQUE NOT NULL,
  involved_trades TEXT[] NOT NULL,
  conflict_type TEXT DEFAULT 'scheduling' CHECK (conflict_type IN ('scheduling', 'quality', 'resource', 'scope', 'communication')),
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  reported_by UUID REFERENCES auth.users(id),
  assigned_mediator UUID REFERENCES auth.users(id),
  resolution_strategy TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'mediation', 'resolved', 'escalated')),
  resolution_date TIMESTAMPTZ,
  lessons_learned TEXT[] DEFAULT '{}',
  impact_assessment TEXT,
  cost_impact DECIMAL(10,2) DEFAULT 0,
  time_impact_hours INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trade_performance_metrics table
CREATE TABLE IF NOT EXISTS trade_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  trade_name TEXT NOT NULL,
  measurement_period_start DATE NOT NULL,
  measurement_period_end DATE NOT NULL,
  handoff_success_rate DECIMAL(3,2) DEFAULT 0,
  average_handoff_time DECIMAL(5,2) DEFAULT 0, -- hours
  quality_score DECIMAL(3,2) DEFAULT 0,
  on_time_completion_rate DECIMAL(3,2) DEFAULT 0,
  rework_incidents INTEGER DEFAULT 0,
  communication_score DECIMAL(3,2) DEFAULT 0,
  coordination_participation DECIMAL(3,2) DEFAULT 0,
  total_handoffs INTEGER DEFAULT 0,
  completed_handoffs INTEGER DEFAULT 0,
  delayed_handoffs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, trade_name, measurement_period_start, measurement_period_end)
);

-- Create action_items table for tracking meeting action items
CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES trade_coordination_meetings(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_trade TEXT,
  due_date DATE NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'overdue')),
  dependencies TEXT[] DEFAULT '{}',
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create handoff_notifications table for tracking communications
CREATE TABLE IF NOT EXISTS handoff_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id UUID REFERENCES trade_handoffs(id) ON DELETE CASCADE,
  recipient_trade TEXT NOT NULL,
  notification_type TEXT DEFAULT 'status_update' CHECK (notification_type IN ('status_update', 'quality_check', 'delay_alert', 'completion', 'meeting_invite')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  response TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'sms', 'push', 'in_app')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trade_handoffs_project_status ON trade_handoffs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_handoffs_completion ON trade_handoffs(estimated_completion, status);
CREATE INDEX IF NOT EXISTS idx_quality_checks_handoff ON quality_checks(handoff_id, required);
CREATE INDEX IF NOT EXISTS idx_coordination_meetings_project_date ON trade_coordination_meetings(project_id, coordination_date);
CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_severity ON conflict_resolutions(severity, status);
CREATE INDEX IF NOT EXISTS idx_trade_performance_project_trade ON trade_performance_metrics(project_id, trade_name);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned_status ON action_items(assigned_to, status, due_date);
CREATE INDEX IF NOT EXISTS idx_handoff_notifications_recipient ON handoff_notifications(recipient_trade, read_at);

-- Create function to auto-update handoff status based on quality checks
CREATE OR REPLACE FUNCTION update_handoff_status_on_quality_check()
RETURNS TRIGGER AS $$
DECLARE
    total_required_checks INTEGER;
    completed_required_checks INTEGER;
    handoff_record RECORD;
BEGIN
    -- Get the handoff record
    SELECT * INTO handoff_record
    FROM trade_handoffs
    WHERE id = NEW.handoff_id;

    -- Count required quality checks
    SELECT COUNT(*) INTO total_required_checks
    FROM quality_checks
    WHERE handoff_id = NEW.handoff_id
    AND required = true;

    -- Count completed required quality checks
    SELECT COUNT(*) INTO completed_required_checks
    FROM quality_checks
    WHERE handoff_id = NEW.handoff_id
    AND required = true
    AND passed = true
    AND completed_at IS NOT NULL;

    -- Update handoff status based on quality check completion
    IF completed_required_checks = total_required_checks AND total_required_checks > 0 THEN
        -- All required checks passed, mark as ready
        UPDATE trade_handoffs
        SET status = 'ready',
            completion_percentage = GREATEST(completion_percentage, 80),
            updated_at = NOW()
        WHERE id = NEW.handoff_id
        AND status = 'pending';
    ELSIF NEW.passed = false AND NEW.required = true THEN
        -- Required check failed, mark as blocked
        UPDATE trade_handoffs
        SET status = 'blocked',
            updated_at = NOW()
        WHERE id = NEW.handoff_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_handoff_status_on_quality_check
    AFTER INSERT OR UPDATE OF passed, completed_at ON quality_checks
    FOR EACH ROW
    EXECUTE FUNCTION update_handoff_status_on_quality_check();

-- Create function to automatically update action item status
CREATE OR REPLACE FUNCTION update_action_item_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark action items as overdue if past due date and not completed
    IF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('completed', 'overdue') THEN
        NEW.status := 'overdue';
    END IF;

    -- Set completion timestamp when marked as completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_action_item_status
    BEFORE UPDATE ON action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_action_item_status();

-- Create function to calculate trade performance metrics
CREATE OR REPLACE FUNCTION calculate_trade_performance_metrics(
    p_project_id UUID,
    p_trade_name TEXT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    handoff_success_rate DECIMAL(3,2),
    average_handoff_time DECIMAL(5,2),
    quality_score DECIMAL(3,2),
    on_time_completion_rate DECIMAL(3,2),
    total_handoffs INTEGER,
    completed_handoffs INTEGER
) AS $$
DECLARE
    total_handoffs_count INTEGER := 0;
    completed_handoffs_count INTEGER := 0;
    on_time_handoffs INTEGER := 0;
    total_quality_checks INTEGER := 0;
    passed_quality_checks INTEGER := 0;
    total_handoff_time DECIMAL(10,2) := 0;
BEGIN
    -- Get handoff statistics
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'completed' THEN 1 END),
        COUNT(CASE WHEN status = 'completed' AND actual_completion <= estimated_completion THEN 1 END),
        SUM(CASE WHEN actual_completion IS NOT NULL AND estimated_completion IS NOT NULL 
                 THEN EXTRACT(EPOCH FROM (actual_completion - (estimated_completion - INTERVAL '1 hour' * estimated_handoff_time))) / 3600 
                 ELSE estimated_handoff_time END)
    INTO total_handoffs_count, completed_handoffs_count, on_time_handoffs, total_handoff_time
    FROM trade_handoffs th
    WHERE th.project_id = p_project_id
    AND (th.from_trade = p_trade_name OR th.to_trade = p_trade_name)
    AND DATE(th.created_at) BETWEEN p_start_date AND p_end_date;

    -- Get quality check statistics
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN qc.passed = true THEN 1 END)
    INTO total_quality_checks, passed_quality_checks
    FROM quality_checks qc
    JOIN trade_handoffs th ON qc.handoff_id = th.id
    WHERE th.project_id = p_project_id
    AND (th.from_trade = p_trade_name OR th.to_trade = p_trade_name)
    AND DATE(qc.created_at) BETWEEN p_start_date AND p_end_date;

    -- Calculate metrics
    RETURN QUERY SELECT
        CASE WHEN total_handoffs_count > 0 
             THEN (completed_handoffs_count::DECIMAL / total_handoffs_count) 
             ELSE 0 END,
        CASE WHEN completed_handoffs_count > 0 
             THEN (total_handoff_time / completed_handoffs_count) 
             ELSE 0 END,
        CASE WHEN total_quality_checks > 0 
             THEN (passed_quality_checks::DECIMAL / total_quality_checks) 
             ELSE 0 END,
        CASE WHEN completed_handoffs_count > 0 
             THEN (on_time_handoffs::DECIMAL / completed_handoffs_count) 
             ELSE 0 END,
        total_handoffs_count,
        completed_handoffs_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to detect potential handoff conflicts
CREATE OR REPLACE FUNCTION detect_handoff_conflicts(p_project_id UUID)
RETURNS TABLE (
    conflict_type TEXT,
    description TEXT,
    severity TEXT,
    involved_handoffs UUID[]
) AS $$
BEGIN
    -- Detect scheduling conflicts
    RETURN QUERY
    SELECT 
        'scheduling'::TEXT,
        'Overlapping handoffs detected: ' || STRING_AGG(th1.from_trade || '->' || th1.to_trade, ', '),
        'high'::TEXT,
        ARRAY_AGG(DISTINCT th1.id)
    FROM trade_handoffs th1
    JOIN trade_handoffs th2 ON th1.project_id = th2.project_id 
        AND th1.id != th2.id
        AND th1.to_trade = th2.from_trade
        AND th1.estimated_completion > th2.estimated_completion
    WHERE th1.project_id = p_project_id
    AND th1.status NOT IN ('completed', 'cancelled')
    AND th2.status NOT IN ('completed', 'cancelled')
    GROUP BY th1.project_id
    HAVING COUNT(*) > 0;

    -- Detect resource conflicts (same trade in multiple handoffs)
    RETURN QUERY
    SELECT 
        'resource'::TEXT,
        'Trade overcommitment detected: ' || trade_name || ' involved in multiple simultaneous handoffs',
        'medium'::TEXT,
        ARRAY_AGG(DISTINCT handoff_id)
    FROM (
        SELECT th.from_trade as trade_name, th.id as handoff_id
        FROM trade_handoffs th
        WHERE th.project_id = p_project_id
        AND th.status IN ('ready', 'in_progress')
        UNION ALL
        SELECT th.to_trade as trade_name, th.id as handoff_id
        FROM trade_handoffs th
        WHERE th.project_id = p_project_id
        AND th.status IN ('ready', 'in_progress')
    ) trade_handoffs
    GROUP BY trade_name
    HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_coordination_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_notifications ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (company-based access)
CREATE POLICY "Users can access trades" ON trades
    FOR ALL USING (true); -- Trades are global reference data

CREATE POLICY "Users can access project trade handoffs" ON trade_handoffs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = trade_handoffs.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access handoff quality checks" ON quality_checks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM trade_handoffs th
            JOIN projects p ON th.project_id = p.id
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE th.id = quality_checks.handoff_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access project coordination meetings" ON trade_coordination_meetings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = trade_coordination_meetings.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access project conflict resolutions" ON conflict_resolutions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = conflict_resolutions.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access project trade performance metrics" ON trade_performance_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE p.id = trade_performance_metrics.project_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access meeting action items" ON action_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM trade_coordination_meetings tcm
            JOIN projects p ON tcm.project_id = p.id
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE tcm.id = action_items.meeting_id
            AND ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access handoff notifications" ON handoff_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM trade_handoffs th
            JOIN projects p ON th.project_id = p.id
            JOIN user_roles ur ON p.company_id = ur.company_id
            WHERE th.id = handoff_notifications.handoff_id
            AND ur.user_id = auth.uid()
        )
    );

-- Insert sample trades data
INSERT INTO trades (name, description, category, typical_duration_days, requires_inspection) VALUES
('foundation', 'Foundation and concrete work', 'structural', 5, true),
('framing', 'Structural framing and carpentry', 'structural', 10, true),
('electrical', 'Electrical rough-in and finish', 'mechanical', 7, true),
('plumbing', 'Plumbing rough-in and finish', 'mechanical', 6, true),
('hvac', 'HVAC installation and ductwork', 'mechanical', 8, true),
('insulation', 'Insulation installation', 'finishing', 2, false),
('drywall', 'Drywall installation and finishing', 'finishing', 8, false),
('flooring', 'Flooring installation', 'finishing', 5, false),
('painting', 'Interior and exterior painting', 'finishing', 6, false),
('trim', 'Trim and finish carpentry', 'finishing', 4, false),
('roofing', 'Roofing installation', 'structural', 3, true),
('siding', 'Exterior siding installation', 'finishing', 4, false)
ON CONFLICT (name) DO NOTHING;
