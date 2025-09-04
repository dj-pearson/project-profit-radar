-- AI Quality Control Tables Migration

-- Table for AI quality analysis results
CREATE TABLE public.ai_quality_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  inspection_id UUID REFERENCES public.quality_inspections(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('defect_detection', 'progress_tracking', 'safety_compliance', 'material_inspection')),
  ai_model_used TEXT NOT NULL DEFAULT 'computer_vision_v1',
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  analysis_results JSONB NOT NULL DEFAULT '{}',
  detected_issues JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'requires_review')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for defect detection results
CREATE TABLE public.ai_defect_detection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  analysis_id UUID NOT NULL REFERENCES public.ai_quality_analysis(id) ON DELETE CASCADE,
  defect_type TEXT NOT NULL,
  defect_category TEXT NOT NULL CHECK (defect_category IN ('structural', 'surface', 'dimensional', 'material', 'workmanship')),
  severity_level TEXT NOT NULL DEFAULT 'medium' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  bounding_box JSONB, -- coordinates of detected defect
  description TEXT,
  suggested_action TEXT,
  cost_impact_estimate NUMERIC(12,2),
  timeline_impact_days INTEGER,
  location_details JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'false_positive')),
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for progress tracking analysis
CREATE TABLE public.ai_progress_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  analysis_id UUID NOT NULL REFERENCES public.ai_quality_analysis(id) ON DELETE CASCADE,
  work_area TEXT NOT NULL,
  completion_percentage NUMERIC(5,2) CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  previous_completion_percentage NUMERIC(5,2),
  progress_change NUMERIC(5,2),
  milestone_status JSONB DEFAULT '[]',
  identified_activities JSONB DEFAULT '[]',
  quality_indicators JSONB DEFAULT '{}',
  productivity_metrics JSONB DEFAULT '{}',
  variance_from_schedule NUMERIC(5,2),
  predicted_completion_date DATE,
  risk_factors JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for safety compliance analysis
CREATE TABLE public.ai_safety_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  analysis_id UUID NOT NULL REFERENCES public.ai_quality_analysis(id) ON DELETE CASCADE,
  safety_category TEXT NOT NULL CHECK (safety_category IN ('ppe_compliance', 'hazard_identification', 'equipment_safety', 'site_conditions')),
  compliance_score NUMERIC(3,2) CHECK (compliance_score >= 0 AND compliance_score <= 1),
  violations_detected JSONB DEFAULT '[]',
  safety_recommendations JSONB DEFAULT '[]',
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  immediate_action_required BOOLEAN DEFAULT false,
  regulatory_standards JSONB DEFAULT '[]',
  corrective_actions JSONB DEFAULT '[]',
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for AI model configurations
CREATE TABLE public.ai_quality_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('defect_detection', 'progress_tracking', 'safety_compliance', 'material_inspection')),
  accuracy_score NUMERIC(3,2),
  training_date DATE,
  is_active BOOLEAN DEFAULT true,
  supported_image_types TEXT[] DEFAULT ARRAY['jpg', 'jpeg', 'png', 'webp'],
  max_image_size_mb INTEGER DEFAULT 10,
  processing_time_avg_ms INTEGER,
  confidence_threshold NUMERIC(3,2) DEFAULT 0.7,
  model_parameters JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(model_name, model_version)
);

-- Table for quality metrics aggregation
CREATE TABLE public.quality_metrics_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_inspections INTEGER DEFAULT 0,
  total_defects_detected INTEGER DEFAULT 0,
  high_severity_defects INTEGER DEFAULT 0,
  average_quality_score NUMERIC(3,2),
  safety_compliance_score NUMERIC(3,2),
  progress_variance NUMERIC(5,2),
  cost_impact_total NUMERIC(12,2) DEFAULT 0,
  time_impact_days INTEGER DEFAULT 0,
  trends JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, project_id, analysis_date)
);

-- Enable Row Level Security
ALTER TABLE public.ai_quality_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_defect_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_safety_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_quality_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_metrics_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_quality_analysis
CREATE POLICY "Users can view company AI quality analysis" 
ON public.ai_quality_analysis FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Quality staff can manage AI quality analysis" 
ON public.ai_quality_analysis FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'quality_inspector'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for ai_defect_detection
CREATE POLICY "Users can view company defect detection" 
ON public.ai_defect_detection FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Quality staff can manage defect detection" 
ON public.ai_defect_detection FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'quality_inspector'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for ai_progress_tracking
CREATE POLICY "Users can view company progress tracking" 
ON public.ai_progress_tracking FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage progress tracking" 
ON public.ai_progress_tracking FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'quality_inspector'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for ai_safety_analysis
CREATE POLICY "Users can view company safety analysis" 
ON public.ai_safety_analysis FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Safety staff can manage safety analysis" 
ON public.ai_safety_analysis FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'safety_officer'::user_role, 'quality_inspector'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for ai_quality_models
CREATE POLICY "Everyone can view active AI quality models" 
ON public.ai_quality_models FOR SELECT 
USING (is_active = true);

CREATE POLICY "Root admins can manage AI quality models" 
ON public.ai_quality_models FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

-- RLS Policies for quality_metrics_summary
CREATE POLICY "Users can view company quality metrics" 
ON public.quality_metrics_summary FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage quality metrics" 
ON public.quality_metrics_summary FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'quality_inspector'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
);

-- Add triggers for updated_at
CREATE TRIGGER update_ai_quality_analysis_updated_at
  BEFORE UPDATE ON public.ai_quality_analysis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_defect_detection_updated_at
  BEFORE UPDATE ON public.ai_defect_detection
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_progress_tracking_updated_at
  BEFORE UPDATE ON public.ai_progress_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_safety_analysis_updated_at
  BEFORE UPDATE ON public.ai_safety_analysis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_quality_models_updated_at
  BEFORE UPDATE ON public.ai_quality_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quality_metrics_summary_updated_at
  BEFORE UPDATE ON public.quality_metrics_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default AI models
INSERT INTO public.ai_quality_models (model_name, model_version, model_type, accuracy_score, confidence_threshold) VALUES
('DefectDetection-YOLOv8', 'v1.0', 'defect_detection', 0.89, 0.7),
('ProgressTracker-CNN', 'v1.0', 'progress_tracking', 0.92, 0.8),
('SafetyCompliance-Vision', 'v1.0', 'safety_compliance', 0.87, 0.75),
('MaterialInspector-AI', 'v1.0', 'material_inspection', 0.85, 0.7);

-- Create indexes for better performance
CREATE INDEX idx_ai_quality_analysis_company_project ON public.ai_quality_analysis(company_id, project_id);
CREATE INDEX idx_ai_quality_analysis_status ON public.ai_quality_analysis(status);
CREATE INDEX idx_ai_defect_detection_severity ON public.ai_defect_detection(severity_level);
CREATE INDEX idx_ai_defect_detection_status ON public.ai_defect_detection(status);
CREATE INDEX idx_quality_metrics_summary_date ON public.quality_metrics_summary(company_id, analysis_date);