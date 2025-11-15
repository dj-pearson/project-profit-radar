-- Saved Filter Presets Table
CREATE TABLE IF NOT EXISTS saved_filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- The context/page this preset is for
  context TEXT NOT NULL, -- 'projects', 'estimates', 'daily_reports', etc.

  -- Filter configuration (stored as JSON)
  filters JSONB NOT NULL,

  -- Sharing
  is_shared BOOLEAN DEFAULT FALSE, -- Share with company

  -- Metadata
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_default BOOLEAN DEFAULT FALSE, -- User's default preset for this context
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(user_id, context, name),
  CHECK(char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Indexes
CREATE INDEX idx_saved_filter_presets_user ON saved_filter_presets(user_id);
CREATE INDEX idx_saved_filter_presets_company ON saved_filter_presets(company_id) WHERE is_shared = TRUE;
CREATE INDEX idx_saved_filter_presets_context ON saved_filter_presets(context);
CREATE INDEX idx_saved_filter_presets_default ON saved_filter_presets(user_id, context, is_default) WHERE is_default = TRUE;

-- RLS Policies
ALTER TABLE saved_filter_presets ENABLE ROW LEVEL SECURITY;

-- Users can view their own presets and shared company presets
CREATE POLICY "Users can view their presets"
  ON saved_filter_presets
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    (is_shared = TRUE AND company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

-- Users can create their own presets
CREATE POLICY "Users can create presets"
  ON saved_filter_presets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own presets
CREATE POLICY "Users can update their presets"
  ON saved_filter_presets
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own presets
CREATE POLICY "Users can delete their presets"
  ON saved_filter_presets
  FOR DELETE
  USING (user_id = auth.uid());

-- Function to increment preset use count
CREATE OR REPLACE FUNCTION increment_filter_preset_use_count(preset_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE saved_filter_presets
  SET use_count = use_count + 1,
      last_used_at = now()
  WHERE id = preset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure only one default per user per context
CREATE OR REPLACE FUNCTION ensure_single_default_preset()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE saved_filter_presets
    SET is_default = FALSE
    WHERE user_id = NEW.user_id
      AND context = NEW.context
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_preset_trigger
  BEFORE INSERT OR UPDATE ON saved_filter_presets
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_single_default_preset();

-- Trigger to update updated_at
CREATE TRIGGER update_saved_filter_presets_updated_at
  BEFORE UPDATE ON saved_filter_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
