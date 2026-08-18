-- Backfill stored public URLs to storage paths (US-289).
--
-- Callers used to persist the permanent, unauthenticated publicUrl into
-- application rows. Those links keep working after a bucket is made private
-- only because the object is still reachable by the public path, which is
-- exactly the exposure US-289 removes. Readers now resolve a stored value
-- through src/lib/storage/signedUrl.ts, which accepts either a path or a
-- legacy URL, so this backfill is not required for correctness - it exists so
-- the legacy form eventually stops appearing in the data at all, which is the
-- precondition for dropping the dual-read branch in a later release.
--
-- Idempotent: rows already holding a path do not match the URL pattern.
--
-- Deliberately NOT flipping any bucket's `public` flag. Shipped iOS builds
-- still resolve stored public URLs, so that flip is the last step of the
-- CLAUDE.md deprecation flow, not this one.

-- Strip everything up to and including /object/public/<bucket>/ from a stored
-- URL, leaving the object path.
CREATE OR REPLACE FUNCTION public.storage_url_to_path(p_value TEXT, p_bucket TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_value IS NULL THEN NULL
    WHEN p_value LIKE '%/storage/v1/object/public/' || p_bucket || '/%'
      THEN split_part(p_value, '/storage/v1/object/public/' || p_bucket || '/', 2)
    WHEN p_value LIKE '%/storage/v1/object/sign/' || p_bucket || '/%'
      THEN split_part(split_part(p_value, '/storage/v1/object/sign/' || p_bucket || '/', 2), '?', 1)
    ELSE p_value
  END
$$;

COMMENT ON FUNCTION public.storage_url_to_path(TEXT, TEXT) IS
  'Converts a legacy Supabase storage URL to the bare object path. Used by the US-289 backfill; safe to drop once no legacy URLs remain.';

-- project_messages.attachments is text[] of what used to be public URLs.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_messages' AND column_name = 'attachments'
  ) THEN
    UPDATE public.project_messages
    SET attachments = (
      SELECT array_agg(public.storage_url_to_path(a, 'project-communications') ORDER BY ord)
      FROM unnest(attachments) WITH ORDINALITY AS t(a, ord)
    )
    WHERE attachments IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM unnest(attachments) AS a
        WHERE a LIKE '%/storage/v1/object/%'
      );
  END IF;
END $$;

-- daily_reports photo arrays.
DO $$
DECLARE
  col TEXT;
BEGIN
  FOR col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reports'
      AND column_name IN ('photos', 'photo_urls')
      AND data_type = 'ARRAY'
  LOOP
    EXECUTE format($f$
      UPDATE public.daily_reports
      SET %1$I = (
        SELECT array_agg(public.storage_url_to_path(a, 'project-documents') ORDER BY ord)
        FROM unnest(%1$I) WITH ORDINALITY AS t(a, ord)
      )
      WHERE %1$I IS NOT NULL
        AND EXISTS (SELECT 1 FROM unnest(%1$I) AS a WHERE a LIKE '%%/storage/v1/object/%%')
    $f$, col);
  END LOOP;
END $$;

-- documents.file_path held a full URL when written by the voice-note path.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'file_path'
  ) THEN
    UPDATE public.documents
    SET file_path = public.storage_url_to_path(file_path, 'project-documents')
    WHERE file_path LIKE '%/storage/v1/object/%project-documents/%';
  END IF;
END $$;

-- Scalar receipt/photo URL columns, where the table and column exist.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('expenses',          'receipt_url',      'receipts'),
      ('project_expenses',  'receipt_url',      'expense-receipts'),
      ('punch_list_items',  'photo_before_url', 'project-documents'),
      ('punch_list_items',  'photo_after_url',  'project-documents')
    ) AS v(tbl, col, bucket)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = r.col
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET %I = public.storage_url_to_path(%I, %L) WHERE %I LIKE %L',
        r.tbl, r.col, r.col, r.bucket, r.col, '%/storage/v1/object/%'
      );
    END IF;
  END LOOP;
END $$;
