-- Create predictive analytics tables for AI-powered insights

-- Create table for storing predictive models and their configurations
CREATE TABLE public.predictive_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('delay_prediction', 'cost_overrun', 'resource_optimization', 'weather_impact', 'risk_assessment')),
  model_version TEXT NOT NULL DEFAULT '1.0',
  training_data_cutoff DATE NOT NULL DEFAULT CURRENT_DATE,
  accuracy_score NUMERIC CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
  confidence_threshold NUMERIC DEFAULT 0.7 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  model_parameters JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_training_date TIMESTAMP WITH TIME ZONE,
  training_sample_size INTEGER DEFAULT 0,
  model_description TEXT
);

-- Create table for storing predictions
CREATE TABLE public.project_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID,
  model_id UUID NOT NULL REFERENCES public.predictive_models(id),
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('delay_prediction', 'cost_overrun', 'resource_optimization', 'weather_impact', 'completion_forecast')),
  predicted_value NUMERIC NOT NULL,
  predicted_unit TEXT NOT NULL, -- days, percentage, dollars, etc.
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  baseline_value NUMERIC,
  variance_from_baseline NUMERIC,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  contributing_factors JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  prediction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  target_date DATE, -- When the prediction is for
  is_validated BOOLEAN DEFAULT false,
  actual_outcome NUMERIC,
  prediction_accuracy NUMERIC,
  validation_date TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking prediction accuracy and model performance
CREATE TABLE public.prediction_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.predictive_models(id),
  company_id UUID NOT NULL,
  evaluation_period_start DATE NOT NULL,
  evaluation_period_end DATE NOT NULL,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  accurate_predictions INTEGER NOT NULL DEFAULT 0,
  accuracy_rate NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN total_predictions > 0 THEN (accurate_predictions::NUMERIC / total_predictions::NUMERIC)
      ELSE 0
    END
  ) STORED,
  average_confidence NUMERIC,
  average_error_margin NUMERIC,
  false_positive_rate NUMERIC,
  false_negative_rate NUMERIC,
  model_drift_indicator NUMERIC, -- Indicates if model performance is degrading
  recommendations_followed_count INTEGER DEFAULT 0,
  recommendations_success_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for historical project data used for training
CREATE TABLE public.project_historical_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID,
  project_name TEXT,
  project_type TEXT,
  original_budget NUMERIC,
  final_cost NUMERIC,
  original_duration_days INTEGER,
  actual_duration_days INTEGER,
  team_size INTEGER,
  weather_delays_days INTEGER DEFAULT 0,
  change_orders_count INTEGER DEFAULT 0,
  change_orders_value NUMERIC DEFAULT 0,
  material_cost_variance_percentage NUMERIC DEFAULT 0,
  labor_cost_variance_percentage NUMERIC DEFAULT 0,
  complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 10),
  client_satisfaction_score INTEGER CHECK (client_satisfaction_score >= 1 AND client_satisfaction_score <= 10),
  project_start_date DATE,
  project_end_date DATE,
  completion_status TEXT CHECK (completion_status IN ('completed', 'cancelled', 'on_hold')),
  delay_reasons JSONB DEFAULT '[]',
  cost_overrun_reasons JSONB DEFAULT '[]',
  success_factors JSONB DEFAULT '[]',
  lessons_learned JSONB DEFAULT '[]',
  seasonal_factors JSONB DEFAULT '{}', -- Weather, holidays, etc.
  resource_utilization_rate NUMERIC, -- Percentage of optimal resource usage
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for real-time analytics dashboard data
CREATE TABLE public.analytics_dashboard_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  cache_key TEXT NOT NULL,
  dashboard_type TEXT NOT NULL CHECK (dashboard_type IN ('executive', 'project_manager', 'field_supervisor', 'financial')),
  cache_data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  cache_version TEXT DEFAULT '1.0',
  data_sources JSONB DEFAULT '[]', -- Track which data sources contributed
  generation_time_ms INTEGER,
  UNIQUE(company_id, cache_key, dashboard_type)
);

-- Enable RLS on all tables
ALTER TABLE public.predictive_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_historical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_dashboard_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Root admins can manage predictive models" 
ON public.predictive_models 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'root_admin'
  )
);

CREATE POLICY "Users can view active models" 
ON public.predictive_models 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can view their company's predictions" 
ON public.project_predictions 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "System can manage predictions" 
ON public.project_predictions 
FOR ALL 
USING (true);

CREATE POLICY "Users can view their company's performance data" 
ON public.prediction_performance 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "System can manage performance data" 
ON public.prediction_performance 
FOR ALL 
USING (true);

CREATE POLICY "Users can manage their company's historical data" 
ON public.project_historical_data 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can access their company's dashboard cache" 
ON public.analytics_dashboard_cache 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_predictive_models_type_active ON public.predictive_models(model_type, is_active);
CREATE INDEX idx_project_predictions_company_type ON public.project_predictions(company_id, prediction_type);
CREATE INDEX idx_project_predictions_project_date ON public.project_predictions(project_id, prediction_date);
CREATE INDEX idx_project_predictions_confidence ON public.project_predictions(confidence_score, risk_level);
CREATE INDEX idx_prediction_performance_model_period ON public.prediction_performance(model_id, evaluation_period_start, evaluation_period_end);
CREATE INDEX idx_historical_data_company_date ON public.project_historical_data(company_id, project_start_date);
CREATE INDEX idx_historical_data_completion ON public.project_historical_data(completion_status, project_type);
CREATE INDEX idx_dashboard_cache_company_expires ON public.analytics_dashboard_cache(company_id, expires_at);
CREATE INDEX idx_dashboard_cache_key_type ON public.analytics_dashboard_cache(cache_key, dashboard_type);

-- Add triggers for updated_at columns
CREATE TRIGGER update_predictive_models_updated_at
  BEFORE UPDATE ON public.predictive_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prediction_performance_updated_at
  BEFORE UPDATE ON public.prediction_performance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_historical_data_updated_at
  BEFORE UPDATE ON public.project_historical_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default predictive models
INSERT INTO public.predictive_models (model_name, model_type, model_description, model_parameters) VALUES
('Project Delay Predictor v1.0', 'delay_prediction', 'Predicts potential project delays based on historical data, weather patterns, and resource allocation', 
 '{"features": ["team_size", "project_complexity", "weather_conditions", "change_orders", "material_availability"], "algorithm": "ensemble", "lookback_days": 90}'
),
('Cost Overrun Forecaster v1.0', 'cost_overrun', 'Forecasts potential cost overruns using budget variance analysis and market trends',
 '{"features": ["budget_variance", "material_price_trends", "labor_cost_changes", "change_order_frequency"], "algorithm": "regression", "confidence_interval": 0.95}'
),
('Resource Optimizer v1.0', 'resource_optimization', 'Optimizes crew allocation and equipment deployment across multiple projects',
 '{"features": ["crew_utilization", "equipment_availability", "project_priorities", "skill_requirements"], "algorithm": "optimization", "update_frequency": "daily"}'
),
('Weather Impact Analyzer v1.0', 'weather_impact', 'Analyzes weather impact on construction schedules and recommends adjustments',
 '{"features": ["weather_forecast", "project_phase", "outdoor_work_percentage", "seasonal_patterns"], "algorithm": "time_series", "forecast_days": 14}'
);

-- Create function to calculate project risk score
CREATE OR REPLACE FUNCTION public.calculate_project_risk_score(
  p_project_id UUID,
  p_company_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  risk_score INTEGER := 50;
  risk_factors JSONB := '[]'::JSONB;
  project_data RECORD;
  budget_variance NUMERIC;
  schedule_variance NUMERIC;
  result JSONB;
BEGIN
  -- Get project data (this would come from actual projects table)
  -- For now, return a sample calculation
  
  -- Calculate budget risk
  budget_variance := RANDOM() * 20 - 10; -- Sample: -10% to +10%
  IF budget_variance > 5 THEN
    risk_score := risk_score + 15;
    risk_factors := risk_factors || jsonb_build_object(
      'factor', 'Budget Overrun Risk',
      'impact', 'high',
      'description', 'Project is ' || budget_variance::text || '% over budget'
    );
  END IF;
  
  -- Calculate schedule risk
  schedule_variance := RANDOM() * 30 - 15; -- Sample: -15 to +15 days
  IF schedule_variance > 7 THEN
    risk_score := risk_score + 20;
    risk_factors := risk_factors || jsonb_build_object(
      'factor', 'Schedule Delay Risk',
      'impact', 'high',
      'description', 'Project is ' || schedule_variance::text || ' days behind schedule'
    );
  END IF;
  
  -- Weather risk (seasonal)
  IF EXTRACT(MONTH FROM CURRENT_DATE) IN (12, 1, 2) THEN
    risk_score := risk_score + 10;
    risk_factors := risk_factors || jsonb_build_object(
      'factor', 'Seasonal Weather Risk',
      'impact', 'medium',
      'description', 'Winter weather may impact outdoor work'
    );
  END IF;
  
  -- Ensure risk score stays within bounds
  risk_score := GREATEST(0, LEAST(100, risk_score));
  
  result := jsonb_build_object(
    'risk_score', risk_score,
    'risk_level', CASE 
      WHEN risk_score >= 80 THEN 'critical'
      WHEN risk_score >= 60 THEN 'high'
      WHEN risk_score >= 40 THEN 'medium'
      ELSE 'low'
    END,
    'risk_factors', risk_factors,
    'calculated_at', now()
  );
  
  RETURN result;
END;
$$;