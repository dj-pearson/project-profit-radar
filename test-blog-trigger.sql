-- Test the blog trigger by manually calling the Edge Function
-- This will help us see if the function itself works
SELECT net.http_post(
  url := 'https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-social-webhook',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTU1NDQsImV4cCI6MjA2NzA3MTU0NH0.1JSYhiiJRohQnt8feFbTza9VnmKFprwsOxW0jBRcM2s',
    'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTU1NDQsImV4cCI6MjA2NzA3MTU0NH0.1JSYhiiJRohQnt8feFbTza9VnmKFprwsOxW0jBRcM2s'
  ),
  body := json_build_object(
    'blog_post_id', 'cf46cd66-66fc-45dc-9ed1-69ebb679a053',
    'company_id', 'fcfd2e31-637b-466b-b533-df70f7f1b3af',
    'status', 'published',
    'title', '7 Hidden Costs of Poor Project Scheduling and How to Avoid Them',
    'published_at', now()
  )::jsonb
);