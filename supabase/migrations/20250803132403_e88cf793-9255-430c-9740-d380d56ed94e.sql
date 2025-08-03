-- Add win/loss analysis fields to bid_submissions table
ALTER TABLE public.bid_submissions 
ADD COLUMN IF NOT EXISTS win_loss_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS loss_reason text,
ADD COLUMN IF NOT EXISTS competitor_winner text,
ADD COLUMN IF NOT EXISTS competitor_bid_amount numeric,
ADD COLUMN IF NOT EXISTS margin_percentage numeric,
ADD COLUMN IF NOT EXISTS lessons_learned_summary text,
ADD COLUMN IF NOT EXISTS follow_up_opportunities text,
ADD COLUMN IF NOT EXISTS client_feedback text,
ADD COLUMN IF NOT EXISTS bid_preparation_hours numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bid_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS roi_if_won numeric,
ADD COLUMN IF NOT EXISTS probability_score integer CHECK (probability_score >= 0 AND probability_score <= 100);

-- Create bid analytics table for performance tracking
CREATE TABLE IF NOT EXISTS public.bid_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  analysis_period text NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_bids_submitted integer DEFAULT 0,
  total_bids_won integer DEFAULT 0,
  total_bids_lost integer DEFAULT 0,
  win_rate_percentage numeric DEFAULT 0,
  total_bid_value numeric DEFAULT 0,
  total_won_value numeric DEFAULT 0,
  average_bid_amount numeric DEFAULT 0,
  average_margin_percentage numeric DEFAULT 0,
  total_bid_costs numeric DEFAULT 0,
  roi_percentage numeric DEFAULT 0,
  top_loss_reasons jsonb DEFAULT '[]'::jsonb,
  top_competitors jsonb DEFAULT '[]'::jsonb,
  performance_trends jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on bid_analytics
ALTER TABLE public.bid_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bid_analytics
CREATE POLICY "Users can view company bid analytics" 
ON public.bid_analytics FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Staff can manage company bid analytics" 
ON public.bid_analytics FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin'])
);

-- Create bid performance benchmarks table
CREATE TABLE IF NOT EXISTS public.bid_performance_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_sector text NOT NULL,
  company_size_category text NOT NULL, -- 'small', 'medium', 'large'
  region text,
  benchmark_type text NOT NULL, -- 'win_rate', 'margin', 'bid_cost', 'preparation_time'
  benchmark_value numeric NOT NULL,
  data_source text,
  sample_size integer,
  confidence_level numeric,
  last_updated date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on benchmarks (read-only for all users)
ALTER TABLE public.bid_performance_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view benchmarks" 
ON public.bid_performance_benchmarks FOR SELECT 
USING (is_active = true);

CREATE POLICY "Root admins can manage benchmarks" 
ON public.bid_performance_benchmarks FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bid_submissions_win_loss ON public.bid_submissions(company_id, win_loss_status);
CREATE INDEX IF NOT EXISTS idx_bid_submissions_submitted_at ON public.bid_submissions(company_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_bid_analytics_company_period ON public.bid_analytics(company_id, analysis_period, period_start);
CREATE INDEX IF NOT EXISTS idx_benchmarks_industry_size ON public.bid_performance_benchmarks(industry_sector, company_size_category);

-- Insert sample benchmark data
INSERT INTO public.bid_performance_benchmarks (industry_sector, company_size_category, benchmark_type, benchmark_value, data_source, sample_size, confidence_level) VALUES
('Construction', 'small', 'win_rate', 25.0, 'Industry Survey 2024', 500, 85.0),
('Construction', 'medium', 'win_rate', 35.0, 'Industry Survey 2024', 300, 85.0),
('Construction', 'large', 'win_rate', 45.0, 'Industry Survey 2024', 150, 85.0),
('Construction', 'small', 'margin', 12.5, 'Industry Survey 2024', 500, 85.0),
('Construction', 'medium', 'margin', 15.0, 'Industry Survey 2024', 300, 85.0),
('Construction', 'large', 'margin', 18.0, 'Industry Survey 2024', 150, 85.0),
('Construction', 'small', 'bid_cost', 2500.0, 'Industry Survey 2024', 400, 80.0),
('Construction', 'medium', 'bid_cost', 5000.0, 'Industry Survey 2024', 250, 80.0),
('Construction', 'large', 'bid_cost', 12000.0, 'Industry Survey 2024', 100, 80.0),
('Residential', 'small', 'win_rate', 30.0, 'Residential Builder Survey 2024', 300, 85.0),
('Residential', 'medium', 'win_rate', 40.0, 'Residential Builder Survey 2024', 200, 85.0),
('Commercial', 'small', 'win_rate', 20.0, 'Commercial Construction Report 2024', 200, 85.0),
('Commercial', 'medium', 'win_rate', 30.0, 'Commercial Construction Report 2024', 150, 85.0),
('Commercial', 'large', 'win_rate', 40.0, 'Commercial Construction Report 2024', 100, 85.0);

-- Create trigger to update bid_analytics when bid_submissions change
CREATE OR REPLACE FUNCTION public.update_bid_analytics_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if win_loss_status changed to 'won' or 'lost'
  IF NEW.win_loss_status != OLD.win_loss_status AND NEW.win_loss_status IN ('won', 'lost') THEN
    -- This will be handled by a scheduled job or manual refresh
    -- For now, just log that an update is needed
    INSERT INTO public.audit_logs (
      company_id, user_id, action_type, resource_type, resource_id, description
    ) VALUES (
      NEW.company_id, auth.uid(), 'status_change', 'bid_submission', NEW.id::text,
      'Bid status changed to ' || NEW.win_loss_status || ' - analytics refresh needed'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;