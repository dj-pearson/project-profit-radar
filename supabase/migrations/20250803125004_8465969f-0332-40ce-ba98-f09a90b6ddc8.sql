-- Create budget tracking table
CREATE TABLE public.budget_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  category TEXT NOT NULL,
  budgeted_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budget alerts table
CREATE TABLE public.budget_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  category TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'overbudget', 'critical')),
  message TEXT NOT NULL,
  threshold_exceeded DECIMAL(5,2) NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for budget_tracking
CREATE POLICY "Users can view budget tracking for their projects" 
ON public.budget_tracking 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create budget tracking" 
ON public.budget_tracking 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update budget tracking" 
ON public.budget_tracking 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create policies for budget_alerts
CREATE POLICY "Users can view budget alerts for their projects" 
ON public.budget_alerts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create budget alerts" 
ON public.budget_alerts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update budget alerts" 
ON public.budget_alerts 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates on budget_tracking
CREATE TRIGGER update_budget_tracking_updated_at
BEFORE UPDATE ON public.budget_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_budget_tracking_project_id ON public.budget_tracking(project_id);
CREATE INDEX idx_budget_tracking_category ON public.budget_tracking(category);
CREATE INDEX idx_budget_alerts_project_id ON public.budget_alerts(project_id);
CREATE INDEX idx_budget_alerts_acknowledged ON public.budget_alerts(acknowledged);
CREATE INDEX idx_budget_alerts_created_at ON public.budget_alerts(created_at);

-- Create function to automatically create budget alerts when thresholds are exceeded
CREATE OR REPLACE FUNCTION public.check_budget_thresholds()
RETURNS TRIGGER AS $$
DECLARE
  variance_percentage DECIMAL;
  alert_message TEXT;
  alert_type_val TEXT;
BEGIN
  -- Calculate variance percentage
  variance_percentage := ((NEW.actual_amount - NEW.budgeted_amount) / NEW.budgeted_amount) * 100;
  
  -- Determine alert type and message
  IF variance_percentage > 20 THEN
    alert_type_val := 'critical';
    alert_message := format('CRITICAL: Budget exceeded by %s%% (%s over budget)', 
                           round(variance_percentage, 1), 
                           to_char(NEW.actual_amount - NEW.budgeted_amount, 'FM$999,999,999.00'));
  ELSIF variance_percentage > 10 THEN
    alert_type_val := 'overbudget';
    alert_message := format('Budget exceeded by %s%% (%s over budget)', 
                           round(variance_percentage, 1), 
                           to_char(NEW.actual_amount - NEW.budgeted_amount, 'FM$999,999,999.00'));
  ELSIF variance_percentage > 5 THEN
    alert_type_val := 'warning';
    alert_message := format('Budget warning: %s%% over budget (%s)', 
                           round(variance_percentage, 1), 
                           to_char(NEW.actual_amount - NEW.budgeted_amount, 'FM$999,999,999.00'));
  ELSE
    -- No alert needed
    RETURN NEW;
  END IF;
  
  -- Insert alert if it doesn't already exist for this project/category/type
  INSERT INTO public.budget_alerts (project_id, category, alert_type, message, threshold_exceeded)
  VALUES (NEW.project_id, NEW.category, alert_type_val, alert_message, variance_percentage)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check budget thresholds on updates
CREATE TRIGGER check_budget_thresholds_trigger
AFTER UPDATE ON public.budget_tracking
FOR EACH ROW
EXECUTE FUNCTION public.check_budget_thresholds();