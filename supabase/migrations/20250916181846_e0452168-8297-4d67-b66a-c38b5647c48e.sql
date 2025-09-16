-- Update site-assets bucket to allow text and XML files
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/png', 
  'image/jpeg', 
  'image/jpg', 
  'image/gif', 
  'image/webp', 
  'image/svg+xml', 
  'image/x-icon',
  'text/plain',
  'application/xml',
  'text/xml',
  'application/octet-stream'
] 
WHERE id = 'site-assets';