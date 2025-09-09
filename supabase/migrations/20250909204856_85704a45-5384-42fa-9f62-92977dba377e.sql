-- Enable RLS on keyword_research_data table
ALTER TABLE keyword_research_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for keyword_research_data
CREATE POLICY "Users can view their company's keyword research data"
ON keyword_research_data FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert keyword research data for their company"
ON keyword_research_data FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company's keyword research data"
ON keyword_research_data FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company's keyword research data"
ON keyword_research_data FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Also allow root admins to manage all keyword research data
CREATE POLICY "Root admins can manage all keyword research data"
ON keyword_research_data FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'root_admin'
  )
);