-- Create automated social media posts configuration table
CREATE TABLE IF NOT EXISTS public.automated_social_posts_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled boolean DEFAULT false,
  post_interval_hours integer DEFAULT 24, -- How often to post (in hours)
  next_post_at timestamp with time zone,
  content_types text[] DEFAULT ARRAY['features', 'benefits', 'knowledge'], -- Types of content to generate
  platforms text[] DEFAULT ARRAY['twitter', 'linkedin', 'facebook', 'instagram'],
  webhook_url text,
  auto_schedule boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create automated social media posts queue table
CREATE TABLE IF NOT EXISTS public.automated_social_posts_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content_type text NOT NULL, -- 'features', 'benefits', 'knowledge'
  topic text NOT NULL, -- The specific topic/feature to post about
  scheduled_for timestamp with time zone NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  platforms_processed text[],
  posts_created integer DEFAULT 0,
  webhook_sent boolean DEFAULT false,
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at timestamp with time zone
);

-- Create automated social media content library table
CREATE TABLE IF NOT EXISTS public.automated_social_content_library (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type text NOT NULL, -- 'features', 'benefits', 'knowledge'
  topic text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  key_points text[],
  cta_template text DEFAULT 'Start your 14-day free trial today!',
  priority integer DEFAULT 1, -- Higher priority = more likely to be selected
  active boolean DEFAULT true,
  usage_count integer DEFAULT 0, -- Track how often this content has been used
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.automated_social_posts_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_social_posts_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_social_content_library ENABLE ROW LEVEL SECURITY;

-- RLS policies for automated_social_posts_config
CREATE POLICY "Users can view own company's automated social posts config" ON public.automated_social_posts_config
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own company's automated social posts config" ON public.automated_social_posts_config
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own company's automated social posts config" ON public.automated_social_posts_config
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

-- RLS policies for automated_social_posts_queue
CREATE POLICY "Users can view own company's automated social posts queue" ON public.automated_social_posts_queue
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage automated social posts queue" ON public.automated_social_posts_queue
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for automated_social_content_library (global read, admin write)
CREATE POLICY "Users can view all automated social content library" ON public.automated_social_content_library
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage automated social content library" ON public.automated_social_content_library
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('root_admin', 'admin')
    )
  );

-- Create update triggers
CREATE OR REPLACE FUNCTION update_automated_social_posts_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_automated_social_posts_config_updated_at
  BEFORE UPDATE ON public.automated_social_posts_config
  FOR EACH ROW EXECUTE FUNCTION update_automated_social_posts_config_updated_at();

CREATE OR REPLACE FUNCTION update_automated_social_content_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_automated_social_content_library_updated_at
  BEFORE UPDATE ON public.automated_social_content_library
  FOR EACH ROW EXECUTE FUNCTION update_automated_social_content_library_updated_at();

-- Insert default content library entries
INSERT INTO public.automated_social_content_library (content_type, topic, title, description, key_points, priority) VALUES
-- Features
('features', 'project-management', 'Advanced Project Management', 'Streamline your construction projects with our comprehensive management tools', ARRAY['Real-time project tracking', 'Team collaboration', 'Document management', 'Timeline optimization'], 3),
('features', 'financial-tracking', 'Financial Management & Reporting', 'Keep your finances on track with automated invoicing and real-time reporting', ARRAY['Automated invoicing', 'Expense tracking', 'Profit margin analysis', 'Cash flow forecasting'], 3),
('features', 'mobile-app', 'Mobile App for Field Teams', 'Keep your field teams connected with our powerful mobile application', ARRAY['Offline functionality', 'Photo documentation', 'Time tracking', 'Real-time updates'], 2),
('features', 'scheduling', 'Smart Scheduling System', 'Optimize your workforce with intelligent scheduling and resource allocation', ARRAY['Drag-and-drop scheduling', 'Resource optimization', 'Conflict detection', 'Calendar integration'], 2),

-- Benefits
('benefits', 'time-savings', 'Save 15+ Hours Per Week', 'Automate repetitive tasks and focus on what matters most - growing your business', ARRAY['Automated workflows', 'Reduced paperwork', 'Streamlined communication', 'Faster decision making'], 3),
('benefits', 'profit-increase', 'Increase Profit Margins by 25%', 'Better cost control and project visibility lead to significantly improved profitability', ARRAY['Real-time cost tracking', 'Budget alerts', 'Waste reduction', 'Accurate estimates'], 3),
('benefits', 'client-satisfaction', 'Improve Client Satisfaction', 'Keep clients informed and engaged throughout the entire project lifecycle', ARRAY['Client portals', 'Progress updates', 'Transparent communication', 'Professional reporting'], 2),
('benefits', 'compliance', 'Stay Compliant & Organized', 'Never miss deadlines or requirements with our compliance management system', ARRAY['Automated reminders', 'Document storage', 'Audit trails', 'Regulatory updates'], 2),

-- Knowledge/Tips
('knowledge', 'project-planning', 'Project Planning Best Practices', 'Essential tips for successful construction project planning and execution', ARRAY['Define clear objectives', 'Create realistic timelines', 'Identify potential risks', 'Establish communication protocols'], 1),
('knowledge', 'cost-control', 'Construction Cost Control Strategies', 'Learn how to keep your projects on budget and maximize profitability', ARRAY['Regular budget reviews', 'Change order management', 'Vendor negotiations', 'Material cost tracking'], 1),
('knowledge', 'team-management', 'Building High-Performance Teams', 'Tips for managing and motivating your construction workforce', ARRAY['Clear role definition', 'Regular feedback', 'Skills development', 'Recognition programs'], 1),
('knowledge', 'technology-adoption', 'Embracing Construction Technology', 'How technology is transforming the construction industry', ARRAY['Digital transformation', 'Productivity gains', 'Competitive advantage', 'ROI measurement'], 1);

-- Function to automatically schedule next post
CREATE OR REPLACE FUNCTION schedule_next_automated_post()
RETURNS TRIGGER AS $$
BEGIN
  -- If auto_schedule is enabled and next_post_at is in the past or null
  IF NEW.auto_schedule = true AND (NEW.next_post_at IS NULL OR NEW.next_post_at <= NOW()) THEN
    NEW.next_post_at = NOW() + (NEW.post_interval_hours || ' hours')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_schedule_next_post
  BEFORE INSERT OR UPDATE ON public.automated_social_posts_config
  FOR EACH ROW EXECUTE FUNCTION schedule_next_automated_post(); 