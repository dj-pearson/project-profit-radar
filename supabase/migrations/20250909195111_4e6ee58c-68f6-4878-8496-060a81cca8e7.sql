-- Create keyword research data table
CREATE TABLE IF NOT EXISTS public.keyword_research_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  search_volume INTEGER DEFAULT 0,
  difficulty NUMERIC DEFAULT 0,
  cpc NUMERIC,
  search_intent TEXT DEFAULT 'informational',
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  current_rank INTEGER,
  target_rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.keyword_research_data ENABLE ROW LEVEL SECURITY;

-- Create policies for keyword research data
CREATE POLICY "Users can view their company's keyword data" 
ON public.keyword_research_data 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND company_id = keyword_research_data.company_id
  )
);

CREATE POLICY "Users can insert keyword data for their company" 
ON public.keyword_research_data 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND company_id = keyword_research_data.company_id
  )
);

CREATE POLICY "Users can update their company's keyword data" 
ON public.keyword_research_data 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND company_id = keyword_research_data.company_id
  )
);

CREATE POLICY "Users can delete their company's keyword data" 
ON public.keyword_research_data 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND company_id = keyword_research_data.company_id
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_keyword_research_data_updated_at
BEFORE UPDATE ON public.keyword_research_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_keyword_research_data_company_id ON public.keyword_research_data(company_id);
CREATE INDEX idx_keyword_research_data_priority ON public.keyword_research_data(priority);
CREATE INDEX idx_keyword_research_data_search_volume ON public.keyword_research_data(search_volume DESC);
CREATE INDEX idx_keyword_research_data_difficulty ON public.keyword_research_data(difficulty);

-- Add target keywords to blog auto generation settings
ALTER TABLE public.blog_auto_generation_settings 
ADD COLUMN IF NOT EXISTS use_keyword_targeting BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS keyword_selection_strategy TEXT DEFAULT 'optimal',
ADD COLUMN IF NOT EXISTS max_keywords_per_post INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS min_search_volume INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_difficulty INTEGER DEFAULT 50;