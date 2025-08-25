-- Add a new queue item to test the automated blog generation
INSERT INTO blog_generation_queue (
  company_id,
  scheduled_for,
  ai_provider,
  ai_model,
  generation_type,
  suggested_topic,
  status,
  priority
) VALUES (
  'fcfd2e31-637b-466b-b533-df70f7f1b3af',
  now(),
  'claude',
  'claude-sonnet-4-20250514', 
  'manual_test',
  'Top 10 Construction Technology Trends Transforming Project Management in 2025',
  'pending',
  1
);