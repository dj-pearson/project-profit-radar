-- Add fields to track keyword usage for blog generation
ALTER TABLE keyword_research_data 
ADD COLUMN used_for_blog_generation BOOLEAN DEFAULT FALSE,
ADD COLUMN blog_generation_count INTEGER DEFAULT 0,
ADD COLUMN last_used_for_blog TIMESTAMP WITH TIME ZONE,
ADD COLUMN selected_for_blog_generation BOOLEAN DEFAULT FALSE;

-- Create index for efficient querying
CREATE INDEX idx_keyword_research_blog_selection 
ON keyword_research_data(company_id, selected_for_blog_generation, used_for_blog_generation) 
WHERE selected_for_blog_generation = TRUE;