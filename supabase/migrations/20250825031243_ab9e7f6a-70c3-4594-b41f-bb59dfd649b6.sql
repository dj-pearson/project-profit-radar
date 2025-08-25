-- Test the enhanced-blog-ai-fixed function with debug response
select
  net.http_post(
      url:='https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/enhanced-blog-ai-fixed',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQ5NTU0NCwiZXhwIjoyMDY3MDcxNTQ0fQ.gcMnZJz-gBST5pqBLGD3nHh8Cx6rJUOtJ8TShDiCFNk"}'::jsonb,
      body:='{"action": "test-debug", "topic": "Test Topic", "customSettings": {"company_id": "fcfd2e31-637b-466b-b533-df70f7f1b3af"}}'::jsonb
  ) as request_id;