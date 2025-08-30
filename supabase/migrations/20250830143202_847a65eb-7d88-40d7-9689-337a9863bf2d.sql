-- Reset pending queue items to be processed now
UPDATE blog_generation_queue 
SET 
  scheduled_for = NOW(),
  updated_at = NOW()
WHERE status = 'pending';

-- Also create a simple queue item for immediate processing
INSERT INTO blog_generation_queue (
  company_id,
  ai_provider,
  ai_model,
  generation_type,
  suggested_topic,
  scheduled_for,
  status,
  priority
) VALUES (
  'fcfd2e31-637b-466b-b533-df70f7f1b3af',
  'claude',
  'claude-sonnet-4-20250514',
  'scheduled',
  'Essential Construction Safety Protocols for 2025',
  NOW(),
  'pending',
  1
);