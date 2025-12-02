-- Add missing RLS policies for knowledge base tables to allow public read access

-- Enable RLS on knowledge_base_articles if not already enabled
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on knowledge_base_categories if not already enabled  
ALTER TABLE knowledge_base_categories ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read published articles (only if policy doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_base_articles' AND policyname = 'Anyone can read published articles') THEN
        CREATE POLICY "Anyone can read published articles" ON knowledge_base_articles
        FOR SELECT USING (is_published = true);
    END IF;
END $$;

-- Allow anyone to read active categories (only if policy doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_base_categories' AND policyname = 'Anyone can read active categories') THEN
        CREATE POLICY "Anyone can read active categories" ON knowledge_base_categories  
        FOR SELECT USING (is_active = true);
    END IF;
END $$;