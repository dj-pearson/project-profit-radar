-- Image Processing Queue Migration
-- Adds support for async image processing and optimization tracking

-- Create image processing queue table
CREATE TABLE IF NOT EXISTS image_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  original_path TEXT NOT NULL,
  bucket TEXT NOT NULL,
  processing_manifest JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  priority INT DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint to prevent duplicate processing
  CONSTRAINT unique_image_processing UNIQUE (original_path, bucket)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_image_processing_queue_site_id ON image_processing_queue(site_id);
CREATE INDEX IF NOT EXISTS idx_image_processing_queue_status ON image_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_image_processing_queue_priority ON image_processing_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_image_processing_queue_pending ON image_processing_queue(status, created_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE image_processing_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view image processing queue for their site"
  ON image_processing_queue FOR SELECT
  USING (
    site_id IN (
      SELECT up.site_id FROM user_profiles up WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert to image processing queue for their site"
  ON image_processing_queue FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT up.site_id FROM user_profiles up WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update image processing queue for their site"
  ON image_processing_queue FOR UPDATE
  USING (
    site_id IN (
      SELECT up.site_id FROM user_profiles up WHERE up.user_id = auth.uid()
    )
  );

-- Service role has full access for edge functions
CREATE POLICY "Service role has full access to image processing queue"
  ON image_processing_queue FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create processed images tracking table
CREATE TABLE IF NOT EXISTS processed_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  original_path TEXT NOT NULL,
  original_size BIGINT NOT NULL,
  original_format TEXT NOT NULL,
  bucket TEXT NOT NULL,

  -- Processed versions stored as JSONB array
  versions JSONB NOT NULL DEFAULT '[]',

  -- Thumbnail info
  thumbnail_path TEXT,
  thumbnail_url TEXT,

  -- Compression stats
  total_processed_size BIGINT,
  savings_percentage DECIMAL(5,2),

  -- Metadata
  width INT,
  height INT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_processed_images_site_id ON processed_images(site_id);
CREATE INDEX IF NOT EXISTS idx_processed_images_document_id ON processed_images(document_id);
CREATE INDEX IF NOT EXISTS idx_processed_images_original_path ON processed_images(original_path);

-- Enable RLS
ALTER TABLE processed_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for processed_images
CREATE POLICY "Users can view processed images for their site"
  ON processed_images FOR SELECT
  USING (
    site_id IN (
      SELECT up.site_id FROM user_profiles up WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert processed images for their site"
  ON processed_images FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT up.site_id FROM user_profiles up WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update processed images for their site"
  ON processed_images FOR UPDATE
  USING (
    site_id IN (
      SELECT up.site_id FROM user_profiles up WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to processed images"
  ON processed_images FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to get optimized image URL
CREATE OR REPLACE FUNCTION get_optimized_image_url(
  p_original_path TEXT,
  p_size TEXT DEFAULT 'medium',
  p_format TEXT DEFAULT 'webp'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version JSONB;
  v_processed_image processed_images%ROWTYPE;
BEGIN
  -- Find the processed image record
  SELECT * INTO v_processed_image
  FROM processed_images
  WHERE original_path = p_original_path
  LIMIT 1;

  IF v_processed_image IS NULL THEN
    RETURN NULL;
  END IF;

  -- Find the requested version
  SELECT value INTO v_version
  FROM jsonb_array_elements(v_processed_image.versions) AS value
  WHERE value->>'format' = p_format
    AND value->>'size' = p_size;

  IF v_version IS NOT NULL THEN
    RETURN v_version->>'path';
  END IF;

  -- Fallback to original size if requested size not found
  SELECT value INTO v_version
  FROM jsonb_array_elements(v_processed_image.versions) AS value
  WHERE value->>'format' = p_format
    AND value->>'size' = 'original';

  IF v_version IS NOT NULL THEN
    RETURN v_version->>'path';
  END IF;

  RETURN NULL;
END;
$$;

-- Function to process pending images (can be called by scheduled function)
CREATE OR REPLACE FUNCTION get_pending_image_jobs(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  site_id UUID,
  company_id UUID,
  original_path TEXT,
  bucket TEXT,
  processing_manifest JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE image_processing_queue ipq
  SET
    status = 'processing',
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE ipq.id IN (
    SELECT inner_ipq.id
    FROM image_processing_queue inner_ipq
    WHERE inner_ipq.status = 'pending'
      AND inner_ipq.attempts < inner_ipq.max_attempts
    ORDER BY inner_ipq.priority DESC, inner_ipq.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    ipq.id,
    ipq.site_id,
    ipq.company_id,
    ipq.original_path,
    ipq.bucket,
    ipq.processing_manifest;
END;
$$;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION complete_image_processing_job(
  p_job_id UUID,
  p_versions JSONB,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_savings_percentage DECIMAL DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE image_processing_queue
  SET
    status = 'completed',
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;

-- Function to mark job as failed
CREATE OR REPLACE FUNCTION fail_image_processing_job(
  p_job_id UUID,
  p_error_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE image_processing_queue
  SET
    status = CASE
      WHEN attempts >= max_attempts THEN 'failed'
      ELSE 'pending'
    END,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;

-- Add comment
COMMENT ON TABLE image_processing_queue IS 'Queue for async image processing jobs (WebP/AVIF conversion)';
COMMENT ON TABLE processed_images IS 'Tracks processed image versions and optimization stats';
