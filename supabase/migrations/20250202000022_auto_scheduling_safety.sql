-- Auto-Scheduling & OSHA Safety Automation
-- Migration: 20250202000022
-- Description: Intelligent scheduling and safety compliance automation

-- =====================================================
-- AUTO SCHEDULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS auto_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  schedule_name TEXT NOT NULL,
  schedule_date DATE NOT NULL,

  -- Optimization goals
  minimize_travel BOOLEAN DEFAULT TRUE,
  balance_workload BOOLEAN DEFAULT TRUE,
  respect_skills BOOLEAN DEFAULT TRUE,

  -- Algorithm metadata
  algorithm_used TEXT DEFAULT 'genetic',
  iterations_count INTEGER DEFAULT 100,
  optimization_score DECIMAL(5,2), -- 0-100
  computation_time_ms INTEGER,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'active', 'completed')),
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auto_schedules_tenant ON auto_schedules(tenant_id);
CREATE INDEX idx_auto_schedules_date ON auto_schedules(schedule_date);
CREATE INDEX idx_auto_schedules_status ON auto_schedules(status);

-- =====================================================
-- SCHEDULE CONSTRAINTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS schedule_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  constraint_type TEXT NOT NULL, -- 'hard', 'soft'
  category TEXT NOT NULL, -- 'availability', 'skills', 'travel', 'workload'

  user_id UUID REFERENCES user_profiles(id),
  project_id UUID REFERENCES projects(id),

  constraint_rule JSONB NOT NULL,
  priority INTEGER DEFAULT 1, -- 1-10

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedule_constraints_tenant ON schedule_constraints(tenant_id);
CREATE INDEX idx_schedule_constraints_user ON schedule_constraints(user_id);
CREATE INDEX idx_schedule_constraints_type ON schedule_constraints(constraint_type);

-- =====================================================
-- CREW SKILLS MATRIX TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crew_skills_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  skill_name TEXT NOT NULL,
  skill_category TEXT, -- 'trade', 'equipment', 'certification'
  proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5), -- 1=beginner, 5=expert

  -- Certifications
  is_certified BOOLEAN DEFAULT FALSE,
  certification_number TEXT,
  certification_expiry DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crew_skills_tenant ON crew_skills_matrix(tenant_id);
CREATE INDEX idx_crew_skills_user ON crew_skills_matrix(user_id);
CREATE INDEX idx_crew_skills_name ON crew_skills_matrix(skill_name);

-- =====================================================
-- OSHA 300 LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS osha_300_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),

  -- Employee information
  employee_name TEXT NOT NULL,
  employee_id TEXT,
  job_title TEXT,

  -- Incident details
  incident_date DATE NOT NULL,
  incident_time TIME,
  incident_location TEXT NOT NULL,
  incident_description TEXT NOT NULL,

  -- Injury/Illness classification
  injury_type TEXT NOT NULL, -- 'injury', 'illness', 'death'
  body_part_affected TEXT,
  severity TEXT CHECK (severity IN ('first_aid', 'medical_treatment', 'lost_time', 'restricted_work', 'fatality')),

  -- OSHA classification
  is_privacy_case BOOLEAN DEFAULT FALSE,
  days_away_from_work INTEGER DEFAULT 0,
  days_of_restricted_work INTEGER DEFAULT 0,
  days_of_job_transfer INTEGER DEFAULT 0,

  -- Follow-up
  treatment_provided TEXT,
  return_to_work_date DATE,

  -- Reporting
  reported_to_osha BOOLEAN DEFAULT FALSE,
  reported_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_osha_300_tenant ON osha_300_log(tenant_id);
CREATE INDEX idx_osha_300_project ON osha_300_log(project_id);
CREATE INDEX idx_osha_300_date ON osha_300_log(incident_date DESC);
CREATE INDEX idx_osha_300_severity ON osha_300_log(severity);

-- =====================================================
-- TOOLBOX TALKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS toolbox_talks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),

  talk_date DATE NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,

  -- Attendees
  attendees JSONB, -- Array of user IDs
  attendee_count INTEGER DEFAULT 0,

  -- Safety topics covered
  topics_covered TEXT[],

  -- Trainer
  conducted_by UUID REFERENCES user_profiles(id),

  -- Documentation
  photo_urls TEXT[],
  signature_urls TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_toolbox_talks_tenant ON toolbox_talks(tenant_id);
CREATE INDEX idx_toolbox_talks_project ON toolbox_talks(project_id);
CREATE INDEX idx_toolbox_talks_date ON toolbox_talks(talk_date DESC);

-- =====================================================
-- SAFETY INSPECTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS safety_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  inspection_date DATE NOT NULL,
  inspection_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'incident'

  -- Inspector
  inspector_id UUID NOT NULL REFERENCES user_profiles(id),
  inspector_name TEXT,

  -- Checklist items
  checklist_items JSONB NOT NULL, -- Array of items with pass/fail
  total_items INTEGER DEFAULT 0,
  passed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,

  -- Overall result
  pass_fail_status TEXT CHECK (pass_fail_status IN ('pass', 'fail', 'conditional')),
  overall_score DECIMAL(5,2),

  -- Issues found
  hazards_identified INTEGER DEFAULT 0,
  violations_found INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,
  photo_urls TEXT[],

  -- Follow-up
  requires_followup BOOLEAN DEFAULT FALSE,
  followup_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_safety_inspections_tenant ON safety_inspections(tenant_id);
CREATE INDEX idx_safety_inspections_project ON safety_inspections(project_id);
CREATE INDEX idx_safety_inspections_date ON safety_inspections(inspection_date DESC);
CREATE INDEX idx_safety_inspections_status ON safety_inspections(pass_fail_status);

-- =====================================================
-- SAFETY VIOLATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS safety_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  inspection_id UUID REFERENCES safety_inspections(id),

  violation_date DATE NOT NULL,
  violation_type TEXT NOT NULL,
  osha_standard TEXT, -- e.g., "1926.451"

  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('minor', 'serious', 'willful', 'repeat')),

  -- Corrective action
  corrective_action_required TEXT,
  corrective_action_taken TEXT,
  corrected_date DATE,

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'waived')),
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_safety_violations_tenant ON safety_violations(tenant_id);
CREATE INDEX idx_safety_violations_project ON safety_violations(project_id);
CREATE INDEX idx_safety_violations_status ON safety_violations(status) WHERE status != 'resolved';
CREATE INDEX idx_safety_violations_severity ON safety_violations(severity);

-- =====================================================
-- SAFETY TRAINING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS safety_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  training_name TEXT NOT NULL,
  training_type TEXT NOT NULL, -- 'osha_10', 'osha_30', 'first_aid', 'fall_protection', etc.

  training_date DATE NOT NULL,
  expiry_date DATE,

  -- Provider
  training_provider TEXT,
  instructor_name TEXT,

  -- Certification
  certification_number TEXT,
  certificate_url TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending_renewal')),

  -- Reminders
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_safety_training_tenant ON safety_training(tenant_id);
CREATE INDEX idx_safety_training_user ON safety_training(user_id);
CREATE INDEX idx_safety_training_type ON safety_training(training_type);
CREATE INDEX idx_safety_training_expiry ON safety_training(expiry_date) WHERE status = 'active';

-- =====================================================
-- PPE TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ppe_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id),

  ppe_type TEXT NOT NULL, -- 'hard_hat', 'safety_glasses', 'harness', 'boots', etc.
  item_description TEXT,

  -- Assignment
  assigned_date DATE NOT NULL,
  returned_date DATE,

  -- Condition
  condition_status TEXT CHECK (condition_status IN ('new', 'good', 'fair', 'poor', 'damaged')),

  -- Inspection
  last_inspection_date DATE,
  next_inspection_date DATE,

  -- Replacement
  replacement_due_date DATE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ppe_tracking_tenant ON ppe_tracking(tenant_id);
CREATE INDEX idx_ppe_tracking_user ON ppe_tracking(user_id);
CREATE INDEX idx_ppe_tracking_type ON ppe_tracking(ppe_type);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE auto_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_skills_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE osha_300_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE toolbox_talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_tracking ENABLE ROW LEVEL SECURITY;

-- Auto schedules policies
CREATE POLICY "Users can view their tenant's schedules"
  ON auto_schedules FOR SELECT
  USING (has_tenant_access(tenant_id));

CREATE POLICY "Managers can manage schedules"
  ON auto_schedules FOR ALL
  USING (has_tenant_access(tenant_id) AND is_user_admin());

-- Crew skills policies
CREATE POLICY "Users can view crew skills"
  ON crew_skills_matrix FOR SELECT
  USING (has_tenant_access(tenant_id));

CREATE POLICY "Users can manage their own skills"
  ON crew_skills_matrix FOR ALL
  USING (user_id = auth.uid());

-- OSHA 300 policies
CREATE POLICY "Authorized users can view OSHA 300 log"
  ON osha_300_log FOR SELECT
  USING (has_tenant_access(tenant_id));

CREATE POLICY "Safety managers can manage OSHA 300 log"
  ON osha_300_log FOR ALL
  USING (has_tenant_access(tenant_id) AND is_user_admin());

-- Safety inspections policies
CREATE POLICY "Users can view safety inspections"
  ON safety_inspections FOR SELECT
  USING (has_tenant_access(tenant_id));

CREATE POLICY "Users can create safety inspections"
  ON safety_inspections FOR INSERT
  WITH CHECK (has_tenant_access(tenant_id));

-- Safety training policies
CREATE POLICY "Users can view safety training"
  ON safety_training FOR SELECT
  USING (has_tenant_access(tenant_id) OR user_id = auth.uid());

CREATE POLICY "Users can manage their own training"
  ON safety_training FOR ALL
  USING (user_id = auth.uid());

COMMENT ON TABLE auto_schedules IS 'AI-generated optimal crew schedules';
COMMENT ON TABLE schedule_constraints IS 'Constraints for scheduling algorithm';
COMMENT ON TABLE crew_skills_matrix IS 'Employee skills and certifications';
COMMENT ON TABLE osha_300_log IS 'OSHA 300 injury and illness log';
COMMENT ON TABLE toolbox_talks IS 'Weekly toolbox safety talks';
COMMENT ON TABLE safety_inspections IS 'Daily/weekly safety inspections';
COMMENT ON TABLE safety_violations IS 'Safety violations and corrective actions';
COMMENT ON TABLE safety_training IS 'Employee safety training and certifications';
COMMENT ON TABLE ppe_tracking IS 'Personal protective equipment assignments';
