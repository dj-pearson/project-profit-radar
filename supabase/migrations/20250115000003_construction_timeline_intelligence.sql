-- Construction Timeline Intelligence: Unified Construction Timeline Intelligence
-- Migration for Phase 2 enhancement #1

-- Add construction intelligence columns to existing tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS construction_phase TEXT,
ADD COLUMN IF NOT EXISTS inspection_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inspection_status TEXT,
ADD COLUMN IF NOT EXISTS minimum_cure_time_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_overlap_with TEXT[],
ADD COLUMN IF NOT EXISTS cannot_overlap_with TEXT[],
ADD COLUMN IF NOT EXISTS prerequisite_tasks TEXT[],
ADD COLUMN IF NOT EXISTS dependent_tasks TEXT[];

-- Create construction_dependencies table for defining phase relationships
CREATE TABLE IF NOT EXISTS construction_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    prerequisite_phase TEXT NOT NULL,
    dependent_phase TEXT NOT NULL,
    dependency_type TEXT NOT NULL CHECK (dependency_type IN ('finish_to_start', 'inspection_required', 'material_delivery', 'weather_dependent')),
    lead_time_days INTEGER DEFAULT 0,
    buffer_time_hours INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(prerequisite_phase, dependent_phase, dependency_type)
);

-- Extend existing inspection_schedule table if it exists, otherwise create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inspection_schedule') THEN
        CREATE TABLE inspection_schedule (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            inspection_type TEXT NOT NULL,
            required_for_phase TEXT,
            scheduled_date DATE,
            scheduled_time TIME DEFAULT '09:00',
            inspector_contact JSONB DEFAULT '{}',
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'failed', 'cancelled')),
            auto_scheduled BOOLEAN DEFAULT false,
            prerequisites_met BOOLEAN DEFAULT false,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
    ELSE
        -- Add new columns to existing table
        ALTER TABLE inspection_schedule 
        ADD COLUMN IF NOT EXISTS required_for_phase TEXT,
        ADD COLUMN IF NOT EXISTS auto_scheduled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS prerequisites_met BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create schedule_optimizations table to track optimization results
CREATE TABLE IF NOT EXISTS schedule_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    optimization_type TEXT NOT NULL CHECK (optimization_type IN ('parallel_execution', 'dependency_optimization', 'resource_leveling', 'critical_path_adjustment')),
    description TEXT NOT NULL,
    tasks_affected UUID[] NOT NULL,
    time_impact_days DECIMAL(4,1) DEFAULT 0,
    cost_impact DECIMAL(10,2) DEFAULT 0,
    implementation_status TEXT DEFAULT 'pending' CHECK (implementation_status IN ('pending', 'approved', 'implemented', 'rejected')),
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    implemented_at TIMESTAMP WITH TIME ZONE
);

-- Create schedule_conflicts table to track and resolve conflicts
CREATE TABLE IF NOT EXISTS schedule_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    conflict_type TEXT NOT NULL CHECK (conflict_type IN ('resource_overlap', 'dependency_violation', 'inspection_gap', 'weather_conflict')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    affected_tasks UUID[] NOT NULL,
    description TEXT NOT NULL,
    suggested_resolution TEXT,
    auto_resolvable BOOLEAN DEFAULT false,
    resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'ignored')),
    resolved_by UUID REFERENCES user_profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create validation_results table to store task validation outcomes
CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    validation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_valid BOOLEAN NOT NULL,
    issues JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    validation_score INTEGER DEFAULT 0, -- 0-100 score
    created_by UUID REFERENCES user_profiles(id)
);

-- Insert default construction dependencies
INSERT INTO construction_dependencies (
    company_id, prerequisite_phase, dependent_phase, dependency_type, lead_time_days, buffer_time_hours
) 
SELECT 
    c.id,
    unnest(ARRAY['site_prep', 'excavation', 'foundation', 'framing', 'electrical_rough', 'plumbing_rough', 'hvac_rough', 'insulation', 'drywall', 'painting']),
    unnest(ARRAY['excavation', 'foundation', 'framing', 'electrical_rough', 'plumbing_rough', 'hvac_rough', 'insulation', 'drywall', 'painting', 'flooring']),
    'finish_to_start',
    0,
    0
FROM companies c
ON CONFLICT (prerequisite_phase, dependent_phase, dependency_type) DO NOTHING;

-- Insert inspection dependencies
INSERT INTO construction_dependencies (
    company_id, prerequisite_phase, dependent_phase, dependency_type, lead_time_days, buffer_time_hours
) 
SELECT 
    c.id,
    unnest(ARRAY['foundation', 'framing', 'electrical_rough', 'plumbing_rough', 'hvac_rough', 'insulation']),
    unnest(ARRAY['framing', 'electrical_rough', 'insulation', 'insulation', 'insulation', 'drywall']),
    'inspection_required',
    1,
    0
FROM companies c
ON CONFLICT (prerequisite_phase, dependent_phase, dependency_type) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE construction_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for construction_dependencies
CREATE POLICY "Users can view company construction dependencies"
ON construction_dependencies FOR SELECT
USING (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Managers can manage construction dependencies"
ON construction_dependencies FOR ALL
USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'root_admin']::user_role[])
);

-- Create RLS policies for schedule_optimizations
CREATE POLICY "Users can view project schedule optimizations"
ON schedule_optimizations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = schedule_optimizations.project_id 
        AND p.company_id = get_user_company(auth.uid())
    ) OR 
    get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Managers can manage schedule optimizations"
ON schedule_optimizations FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = schedule_optimizations.project_id 
        AND p.company_id = get_user_company(auth.uid())
    ) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'root_admin']::user_role[])
);

-- Create RLS policies for schedule_conflicts
CREATE POLICY "Users can view project schedule conflicts"
ON schedule_conflicts FOR SELECT
USING (
    (project_id IS NULL) OR
    EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = schedule_conflicts.project_id 
        AND p.company_id = get_user_company(auth.uid())
    ) OR 
    get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Managers can manage schedule conflicts"
ON schedule_conflicts FOR ALL
USING (
    (project_id IS NULL AND get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'root_admin']::user_role[])) OR
    (EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = schedule_conflicts.project_id 
        AND p.company_id = get_user_company(auth.uid())
    ) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'foreman', 'field_supervisor', 'root_admin']::user_role[]))
);

-- Create RLS policies for validation_results
CREATE POLICY "Users can view task validation results"
ON validation_results FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = validation_results.task_id 
        AND p.company_id = get_user_company(auth.uid())
    ) OR 
    get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "System can create validation results"
ON validation_results FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = validation_results.task_id 
        AND p.company_id = get_user_company(auth.uid())
    ) OR 
    get_user_role(auth.uid()) = 'root_admin'
);

-- Create indexes for performance
CREATE INDEX idx_construction_dependencies_company_phases 
ON construction_dependencies(company_id, prerequisite_phase, dependent_phase);

CREATE INDEX idx_construction_dependencies_active 
ON construction_dependencies(is_active, dependency_type) WHERE is_active = true;

CREATE INDEX idx_schedule_optimizations_project_status 
ON schedule_optimizations(project_id, implementation_status);

CREATE INDEX idx_schedule_conflicts_project_severity 
ON schedule_conflicts(project_id, severity, resolution_status);

CREATE INDEX idx_schedule_conflicts_open 
ON schedule_conflicts(resolution_status, created_at) WHERE resolution_status = 'open';

CREATE INDEX idx_validation_results_task_date 
ON validation_results(task_id, validation_date DESC);

CREATE INDEX idx_tasks_construction_phase 
ON tasks(construction_phase) WHERE construction_phase IS NOT NULL;

CREATE INDEX idx_tasks_inspection_required 
ON tasks(inspection_required, inspection_status) WHERE inspection_required = true;

-- Add trigger for updated_at timestamps
CREATE TRIGGER update_construction_dependencies_updated_at
    BEFORE UPDATE ON construction_dependencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspection_schedule_updated_at
    BEFORE UPDATE ON inspection_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to validate task sequence
CREATE OR REPLACE FUNCTION validate_task_sequence(project_id_param UUID)
RETURNS TABLE (
    task_id UUID,
    task_name TEXT,
    is_valid BOOLEAN,
    validation_score INTEGER,
    issues JSONB,
    recommendations JSONB
) AS $$
DECLARE
    task_record RECORD;
    validation_issues JSONB := '[]';
    validation_recommendations JSONB := '[]';
    score INTEGER;
BEGIN
    -- Loop through all tasks in the project
    FOR task_record IN
        SELECT t.*, p.company_id
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.project_id = project_id_param
        ORDER BY t.start_date
    LOOP
        validation_issues := '[]';
        validation_recommendations := '[]';
        score := 100;

        -- Check if construction phase is set
        IF task_record.construction_phase IS NULL THEN
            validation_issues := validation_issues || jsonb_build_object(
                'type', 'missing_phase',
                'severity', 'medium',
                'description', 'Construction phase not specified'
            );
            score := score - 20;
        END IF;

        -- Check for missing dependencies
        IF task_record.construction_phase IS NOT NULL THEN
            -- Check if prerequisites exist
            DECLARE
                prereq_record RECORD;
                prereq_task_exists BOOLEAN;
            BEGIN
                FOR prereq_record IN
                    SELECT prerequisite_phase
                    FROM construction_dependencies
                    WHERE company_id = task_record.company_id
                    AND dependent_phase = task_record.construction_phase
                    AND is_active = true
                LOOP
                    SELECT EXISTS(
                        SELECT 1 FROM tasks
                        WHERE project_id = project_id_param
                        AND construction_phase = prereq_record.prerequisite_phase
                    ) INTO prereq_task_exists;

                    IF NOT prereq_task_exists THEN
                        validation_issues := validation_issues || jsonb_build_object(
                            'type', 'missing_dependency',
                            'severity', 'high',
                            'description', format('Missing prerequisite phase: %s', prereq_record.prerequisite_phase)
                        );
                        score := score - 30;
                    END IF;
                END LOOP;
            END;
        END IF;

        -- Check if inspections are required
        IF task_record.construction_phase IN ('foundation', 'framing', 'electrical_rough', 'plumbing_rough', 'hvac_rough', 'insulation') THEN
            IF task_record.inspection_required IS NOT TRUE THEN
                validation_recommendations := validation_recommendations || jsonb_build_object(
                    'type', 'inspection_needed',
                    'description', format('Consider marking %s as inspection required', task_record.construction_phase)
                );
            END IF;
        END IF;

        -- Return validation result
        task_id := task_record.id;
        task_name := task_record.name;
        is_valid := score >= 70;
        validation_score := score;
        issues := validation_issues;
        recommendations := validation_recommendations;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-schedule inspections
CREATE OR REPLACE FUNCTION auto_schedule_inspections(project_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    task_record RECORD;
    inspection_count INTEGER := 0;
    optimal_date DATE;
BEGIN
    -- Loop through tasks that require inspections
    FOR task_record IN
        SELECT *
        FROM tasks
        WHERE project_id = project_id_param
        AND inspection_required = true
        AND construction_phase IS NOT NULL
        ORDER BY end_date
    LOOP
        -- Calculate optimal inspection date (day after task completion)
        optimal_date := (task_record.end_date::DATE) + INTERVAL '1 day';

        -- Check if inspection already exists
        IF NOT EXISTS (
            SELECT 1 FROM inspection_schedule
            WHERE project_id = project_id_param
            AND required_for_phase = task_record.construction_phase
        ) THEN
            -- Create inspection schedule
            INSERT INTO inspection_schedule (
                project_id,
                inspection_type,
                required_for_phase,
                scheduled_date,
                status,
                auto_scheduled,
                notes
            ) VALUES (
                project_id_param,
                task_record.construction_phase || '_inspection',
                task_record.construction_phase,
                optimal_date,
                'pending',
                true,
                format('Auto-scheduled for %s completion', task_record.construction_phase)
            );

            inspection_count := inspection_count + 1;
        END IF;
    END LOOP;

    RETURN inspection_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to detect schedule conflicts
CREATE OR REPLACE FUNCTION detect_schedule_conflicts(project_id_param UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    conflict_count INTEGER := 0;
    task_record RECORD;
    overlapping_task RECORD;
    conflict_id UUID;
BEGIN
    -- Clear existing conflicts for the project
    IF project_id_param IS NOT NULL THEN
        DELETE FROM schedule_conflicts WHERE project_id = project_id_param;
    END IF;

    -- Check for resource conflicts (overlapping tasks)
    FOR task_record IN
        SELECT t1.*, p.company_id
        FROM tasks t1
        JOIN projects p ON t1.project_id = p.id
        WHERE (project_id_param IS NULL OR t1.project_id = project_id_param)
        AND t1.status != 'completed'
    LOOP
        -- Find overlapping tasks
        FOR overlapping_task IN
            SELECT t2.*
            FROM tasks t2
            WHERE t2.project_id = task_record.project_id
            AND t2.id != task_record.id
            AND t2.status != 'completed'
            AND t2.start_date < task_record.end_date
            AND t2.end_date > task_record.start_date
        LOOP
            -- Check if this is a problematic overlap
            IF task_record.construction_phase IS NOT NULL 
               AND overlapping_task.construction_phase IS NOT NULL 
               AND task_record.construction_phase != overlapping_task.construction_phase THEN
                
                conflict_id := gen_random_uuid();
                
                INSERT INTO schedule_conflicts (
                    id,
                    project_id,
                    conflict_type,
                    severity,
                    affected_tasks,
                    description,
                    suggested_resolution,
                    auto_resolvable
                ) VALUES (
                    conflict_id,
                    task_record.project_id,
                    'resource_overlap',
                    'medium',
                    ARRAY[task_record.id, overlapping_task.id],
                    format('Tasks %s and %s overlap in time', task_record.name, overlapping_task.name),
                    'Adjust task scheduling to prevent resource conflicts',
                    true
                );
                
                conflict_count := conflict_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN conflict_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to optimize project schedule
CREATE OR REPLACE FUNCTION optimize_project_schedule(project_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    optimization_result JSONB;
    parallel_opportunities INTEGER := 0;
    time_savings DECIMAL(4,1) := 0;
    task_record RECORD;
BEGIN
    -- Initialize result
    optimization_result := jsonb_build_object(
        'project_id', project_id_param,
        'optimizations_applied', '[]'::jsonb,
        'estimated_time_saved', 0,
        'critical_path_improved', false
    );

    -- Look for parallel execution opportunities
    -- Check if electrical, plumbing, and HVAC rough-ins can be parallelized
    IF EXISTS (
        SELECT 1 FROM tasks 
        WHERE project_id = project_id_param 
        AND construction_phase = 'electrical_rough'
    ) AND EXISTS (
        SELECT 1 FROM tasks 
        WHERE project_id = project_id_param 
        AND construction_phase = 'plumbing_rough'
    ) AND EXISTS (
        SELECT 1 FROM tasks 
        WHERE project_id = project_id_param 
        AND construction_phase = 'hvac_rough'
    ) THEN
        -- These can potentially be parallelized
        time_savings := time_savings + 3.0; -- Estimate 3 days savings
        
        optimization_result := jsonb_set(
            optimization_result,
            '{optimizations_applied}',
            (optimization_result->'optimizations_applied') || jsonb_build_object(
                'type', 'parallel_execution',
                'description', 'Electrical, plumbing, and HVAC rough-ins can be parallelized',
                'time_impact', 3.0
            )
        );

        -- Create optimization record
        INSERT INTO schedule_optimizations (
            project_id,
            optimization_type,
            description,
            tasks_affected,
            time_impact_days,
            implementation_status
        )
        SELECT 
            project_id_param,
            'parallel_execution',
            'Parallelize electrical, plumbing, and HVAC rough-ins',
            array_agg(id),
            3.0,
            'pending'
        FROM tasks
        WHERE project_id = project_id_param
        AND construction_phase IN ('electrical_rough', 'plumbing_rough', 'hvac_rough');

        parallel_opportunities := parallel_opportunities + 1;
    END IF;

    -- Update result with final values
    optimization_result := jsonb_set(optimization_result, '{estimated_time_saved}', to_jsonb(time_savings));
    optimization_result := jsonb_set(optimization_result, '{critical_path_improved}', to_jsonb(time_savings > 0));

    RETURN optimization_result;
END;
$$ LANGUAGE plpgsql;

-- Add comment for tracking
COMMENT ON TABLE construction_dependencies IS 'Phase 2 Enhancement: Construction Timeline Intelligence - Phase dependency rules';
COMMENT ON TABLE schedule_optimizations IS 'Phase 2 Enhancement: Construction Timeline Intelligence - Schedule optimization tracking';
COMMENT ON TABLE schedule_conflicts IS 'Phase 2 Enhancement: Construction Timeline Intelligence - Schedule conflict detection and resolution';
