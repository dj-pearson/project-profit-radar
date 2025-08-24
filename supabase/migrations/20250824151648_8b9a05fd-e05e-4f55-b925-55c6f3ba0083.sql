-- Manually trigger processing of the most recent pending queue item
SELECT 
  net.http_post(
    url := 'https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/social-content-generator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQ5NTU0NCwiZXhwIjoyMDY3MDcxNTQ0fQ.oxtduha4D2ae4OBgBtLyVN5urBa8KQl6iq2ILa5VBQY"}'::jsonb,
    body := json_build_object(
      'queue_id', '5de4fa22-5698-4fba-9ecc-4ce75d740161',
      'company_id', 'fcfd2e31-637b-466b-b533-df70f7f1b3af',
      'topic', 'project_management',
      'content_type', 'features'
    )::jsonb
  ) as request_result;