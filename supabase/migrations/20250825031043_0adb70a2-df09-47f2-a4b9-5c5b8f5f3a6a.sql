-- Test the enhanced-blog-ai-fixed function directly
select
  net.http_post(
      url:='https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/enhanced-blog-ai-fixed',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQ5NTU0NCwiZXhwIjoyMDY3MDcxNTQ0fQ.gcMnZJz-gBST5pqBLGD3nHh8Cx6rJUOtJ8TShDiCFNk"}'::jsonb,
      body:='{"action": "generate-auto-content", "topic": "How to Optimize Construction Equipment Utilization for Maximum ROI", "customSettings": {"company_id": "fcfd2e31-637b-466b-b533-df70f7f1b3af", "queue_id": "8f755840-8437-4c5a-9b5b-819c9faa5014"}}'::jsonb
  ) as request_id;