-- ============================================================================
-- Video Upload Support Migration
-- ============================================================================
-- Adds video-specific metadata fields to documents table
-- Creates upload configuration table for size limits
-- ============================================================================

-- ============================================================================
-- 1. ADD VIDEO METADATA FIELDS TO DOCUMENTS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add video duration (in seconds)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'video_duration') THEN
    ALTER TABLE documents ADD COLUMN video_duration NUMERIC(10, 2);
  END IF;

  -- Add video width (pixels)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'video_width') THEN
    ALTER TABLE documents ADD COLUMN video_width INTEGER;
  END IF;

  -- Add video height (pixels)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'video_height') THEN
    ALTER TABLE documents ADD COLUMN video_height INTEGER;
  END IF;

  -- Add video codec
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'video_codec') THEN
    ALTER TABLE documents ADD COLUMN video_codec VARCHAR(50);
  END IF;

  -- Add video bitrate
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'video_bitrate') THEN
    ALTER TABLE documents ADD COLUMN video_bitrate INTEGER;
  END IF;

  -- Add thumbnail URL (for video preview)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'thumbnail_url') THEN
    ALTER TABLE documents ADD COLUMN thumbnail_url TEXT;
  END IF;

  -- Add media type enum (image, video, audio, document)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'media_type') THEN
    ALTER TABLE documents ADD COLUMN media_type VARCHAR(20) DEFAULT 'document';
  END IF;

  -- Add transcoding status (for video processing)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'transcoding_status') THEN
    ALTER TABLE documents ADD COLUMN transcoding_status VARCHAR(20) DEFAULT 'none';
  END IF;

  -- Add transcoded versions (JSON array of different quality versions)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'transcoded_versions') THEN
    ALTER TABLE documents ADD COLUMN transcoded_versions JSONB DEFAULT '[]';
  END IF;
END $$;

-- Create index for video documents
CREATE INDEX IF NOT EXISTS idx_documents_media_type ON documents(media_type);
CREATE INDEX IF NOT EXISTS idx_documents_video_duration ON documents(video_duration) WHERE media_type = 'video';

-- ============================================================================
-- 2. CREATE UPLOAD CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS upload_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  company_id UUID REFERENCES companies(id),

  -- Configuration name
  config_name VARCHAR(100) NOT NULL,

  -- File type configuration
  file_category VARCHAR(50) NOT NULL, -- 'image', 'video', 'document', 'audio', 'all'
  allowed_extensions TEXT[], -- ['.mp4', '.mov', '.pdf', etc.]
  allowed_mime_types TEXT[], -- ['video/mp4', 'image/jpeg', etc.]

  -- Size limits (in bytes)
  max_file_size_bytes BIGINT NOT NULL DEFAULT 10485760, -- 10MB default
  max_total_storage_bytes BIGINT, -- Optional total storage limit

  -- Dimension limits (for images/videos)
  max_width INTEGER,
  max_height INTEGER,
  max_duration_seconds INTEGER, -- For videos/audio

  -- Quality/processing settings
  auto_compress BOOLEAN DEFAULT false,
  target_quality INTEGER DEFAULT 80, -- 0-100
  generate_thumbnail BOOLEAN DEFAULT true,
  thumbnail_size INTEGER DEFAULT 300, -- Max dimension

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint for default config per category per site/company
  CONSTRAINT unique_default_config UNIQUE (site_id, company_id, file_category, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_upload_configurations_site ON upload_configurations(site_id);
CREATE INDEX IF NOT EXISTS idx_upload_configurations_category ON upload_configurations(site_id, file_category);
CREATE INDEX IF NOT EXISTS idx_upload_configurations_default ON upload_configurations(site_id, is_default) WHERE is_default = true;

-- RLS Policies
ALTER TABLE upload_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "upload_configurations_select" ON upload_configurations;
CREATE POLICY "upload_configurations_select" ON upload_configurations
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "upload_configurations_admin_manage" ON upload_configurations;
CREATE POLICY "upload_configurations_admin_manage" ON upload_configurations
  FOR ALL USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'root_admin')
    )
  );

-- ============================================================================
-- 3. INSERT DEFAULT UPLOAD CONFIGURATIONS
-- ============================================================================

DO $$
DECLARE
  builddesk_site_id UUID;
BEGIN
  -- Get BuildDesk site ID
  SELECT id INTO builddesk_site_id FROM sites WHERE key = 'builddesk' LIMIT 1;

  IF builddesk_site_id IS NOT NULL THEN
    -- Default Image Configuration
    INSERT INTO upload_configurations (
      site_id, config_name, file_category, allowed_extensions, allowed_mime_types,
      max_file_size_bytes, max_width, max_height, auto_compress, target_quality,
      generate_thumbnail, thumbnail_size, is_default
    ) VALUES (
      builddesk_site_id,
      'Default Image Upload',
      'image',
      ARRAY['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'],
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml'],
      10485760, -- 10MB
      4096, -- Max 4K width
      4096, -- Max 4K height
      true, -- Auto compress
      85, -- 85% quality
      true,
      300,
      true
    )
    ON CONFLICT DO NOTHING;

    -- Default Video Configuration
    INSERT INTO upload_configurations (
      site_id, config_name, file_category, allowed_extensions, allowed_mime_types,
      max_file_size_bytes, max_width, max_height, max_duration_seconds,
      auto_compress, generate_thumbnail, is_default
    ) VALUES (
      builddesk_site_id,
      'Default Video Upload',
      'video',
      ARRAY['.mp4', '.webm', '.mov', '.avi', '.wmv', '.mpeg', '.mpg', '.ogg'],
      ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/mpeg', 'video/ogg'],
      104857600, -- 100MB
      3840, -- 4K width
      2160, -- 4K height
      600, -- 10 minutes max
      false, -- No auto compress for videos (too resource intensive)
      true,
      true
    )
    ON CONFLICT DO NOTHING;

    -- Default Document Configuration
    INSERT INTO upload_configurations (
      site_id, config_name, file_category, allowed_extensions, allowed_mime_types,
      max_file_size_bytes, is_default
    ) VALUES (
      builddesk_site_id,
      'Default Document Upload',
      'document',
      ARRAY['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.csv'],
      ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/rtf',
        'text/csv'
      ],
      52428800, -- 50MB for documents
      true
    )
    ON CONFLICT DO NOTHING;

    -- Large Video Configuration (for premium users)
    INSERT INTO upload_configurations (
      site_id, config_name, file_category, allowed_extensions, allowed_mime_types,
      max_file_size_bytes, max_width, max_height, max_duration_seconds,
      auto_compress, generate_thumbnail, is_default
    ) VALUES (
      builddesk_site_id,
      'Large Video Upload (Premium)',
      'video',
      ARRAY['.mp4', '.webm', '.mov', '.avi', '.wmv', '.mpeg', '.mpg', '.ogg'],
      ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/mpeg', 'video/ogg'],
      524288000, -- 500MB
      3840,
      2160,
      1800, -- 30 minutes
      false,
      true,
      false -- Not default
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE HELPER FUNCTION TO GET UPLOAD CONFIG
-- ============================================================================

CREATE OR REPLACE FUNCTION get_upload_config(
  p_site_id UUID,
  p_company_id UUID DEFAULT NULL,
  p_file_category VARCHAR DEFAULT 'all'
)
RETURNS TABLE (
  config_name VARCHAR,
  file_category VARCHAR,
  allowed_extensions TEXT[],
  allowed_mime_types TEXT[],
  max_file_size_bytes BIGINT,
  max_width INTEGER,
  max_height INTEGER,
  max_duration_seconds INTEGER,
  auto_compress BOOLEAN,
  generate_thumbnail BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.config_name,
    uc.file_category,
    uc.allowed_extensions,
    uc.allowed_mime_types,
    uc.max_file_size_bytes,
    uc.max_width,
    uc.max_height,
    uc.max_duration_seconds,
    uc.auto_compress,
    uc.generate_thumbnail
  FROM upload_configurations uc
  WHERE uc.site_id = p_site_id
    AND uc.is_active = true
    AND uc.is_default = true
    AND (p_file_category = 'all' OR uc.file_category = p_file_category)
    AND (p_company_id IS NULL OR uc.company_id IS NULL OR uc.company_id = p_company_id)
  ORDER BY
    CASE WHEN uc.company_id IS NOT NULL THEN 0 ELSE 1 END, -- Company-specific first
    uc.file_category;
END;
$$;

-- ============================================================================
-- 5. ADD PROJECT DOCUMENTATION VIDEO SUPPORT
-- ============================================================================

-- Create project_videos junction table for easy video management per project
CREATE TABLE IF NOT EXISTS project_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Video-specific metadata
  title VARCHAR(255),
  description TEXT,
  video_type VARCHAR(50) DEFAULT 'documentation', -- documentation, progress, safety, training

  -- Display order
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Unique constraint
  CONSTRAINT unique_project_video UNIQUE (project_id, document_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_videos_project ON project_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_videos_site ON project_videos(site_id);
CREATE INDEX IF NOT EXISTS idx_project_videos_type ON project_videos(project_id, video_type);

-- RLS Policies
ALTER TABLE project_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_videos_select" ON project_videos;
CREATE POLICY "project_videos_select" ON project_videos
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "project_videos_insert" ON project_videos;
CREATE POLICY "project_videos_insert" ON project_videos
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "project_videos_update" ON project_videos;
CREATE POLICY "project_videos_update" ON project_videos
  FOR UPDATE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "project_videos_delete" ON project_videos;
CREATE POLICY "project_videos_delete" ON project_videos
  FOR DELETE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run to verify:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'documents' AND column_name LIKE 'video%';
-- SELECT * FROM upload_configurations;
-- SELECT * FROM get_upload_config((SELECT id FROM sites WHERE key = 'builddesk'), NULL, 'video');
