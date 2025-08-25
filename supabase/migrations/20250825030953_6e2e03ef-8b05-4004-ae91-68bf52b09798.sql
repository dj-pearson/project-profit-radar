-- Manually trigger the blog generation queue processing
select
  net.http_post(
      url:='https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/process-blog-generation-queue',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQ5NTU0NCwiZXhwIjoyMDY3MDcxNTQ0fQ.gcMnZJz-gBST5pqBLGD3nHh8Cx6rJUOtJ8TShDiCFNk"}'::jsonb,
      body:='{"action": "process_queue"}'::jsonb
  ) as request_id;