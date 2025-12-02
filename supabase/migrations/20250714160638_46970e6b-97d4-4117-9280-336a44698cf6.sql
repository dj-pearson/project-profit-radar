-- Add RLS policies for knowledge base tables to allow public read access

-- Enable RLS on knowledge_base_articles if not already enabled
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on knowledge_base_categories if not already enabled  
ALTER TABLE knowledge_base_categories ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read published articles
CREATE POLICY "Anyone can read published articles" ON knowledge_base_articles
FOR SELECT USING (is_published = true);

-- Allow anyone to read active categories
CREATE POLICY "Anyone can read active categories" ON knowledge_base_categories  
FOR SELECT USING (is_active = true);

-- Allow root admins to manage all knowledge base content
CREATE POLICY "Root admins can manage all articles" ON knowledge_base_articles
FOR ALL USING (get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Root admins can manage all categories" ON knowledge_base_categories
FOR ALL USING (get_user_role(auth.uid()) = 'root_admin');