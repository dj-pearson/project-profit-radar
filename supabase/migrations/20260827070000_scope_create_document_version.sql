-- create_document_version accepted any document id from any caller (US-305).
--
-- The function is SECURITY DEFINER, so it runs past RLS on both
-- public.documents and public.document_versions, and it carried no
-- authorisation check of its own. Any authenticated caller could pass another
-- company's p_document_id and:
--
--   * insert a version row against that document,
--   * bump its version number, and
--   * rewrite public.documents.file_path to a path of their choosing.
--
-- The third is the damaging one. file_path is what every reader downloads, so
-- overwriting it silently replaces the file another company's users see, with
-- no trace in the documents row beyond an updated_at bump.
--
-- The guard denies only the cross-tenant case: a document that exists, carries
-- a company_id, and that company is not the caller's. It deliberately does not
-- deny a NULL company_id -- DocumentManagement writes company_id from the
-- caller profile and can persist NULL, and denying those would break versioning
-- on historical rows with no path for the user to recover. A non-existent
-- document id still fails on the document_versions FK, as before.
--
-- Signature, parameter names, defaults and return type are unchanged, so
-- clients at MIN_SUPPORTED_IOS_VERSION and cached web clients keep resolving
-- the same function. The only calls that change behaviour are ones no
-- legitimate client makes.

CREATE OR REPLACE FUNCTION public.create_document_version(
  p_document_id uuid,
  p_file_path text,
  p_file_size integer,
  p_checksum text DEFAULT NULL::text,
  p_version_notes text DEFAULT NULL::text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  new_version_number INTEGER;
  version_id UUID;
BEGIN
  -- US-305: refuse to version a document owned by another company.
  IF EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = p_document_id
      AND d.company_id IS NOT NULL
      AND d.company_id IS DISTINCT FROM public.get_user_company(auth.uid())
      AND public.get_user_role(auth.uid()) IS DISTINCT FROM 'root_admin'::public.user_role
  ) THEN
    RAISE EXCEPTION 'Document % is not in your company', p_document_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO new_version_number
  FROM public.document_versions
  WHERE document_id = p_document_id;

  -- Mark all existing versions as not current
  UPDATE public.document_versions
  SET is_current = false
  WHERE document_id = p_document_id;

  -- Create new version
  INSERT INTO public.document_versions (
    document_id,
    version_number,
    file_path,
    file_size,
    checksum,
    version_notes,
    created_by,
    is_current
  ) VALUES (
    p_document_id,
    new_version_number,
    p_file_path,
    p_file_size,
    p_checksum,
    p_version_notes,
    auth.uid(),
    true
  ) RETURNING id INTO version_id;

  -- Update main document record
  UPDATE public.documents
  SET
    file_path = p_file_path,
    file_size = p_file_size,
    version = new_version_number,
    updated_at = now()
  WHERE id = p_document_id;

  RETURN version_id;
END;
$function$;

COMMENT ON FUNCTION public.create_document_version(uuid, text, integer, text, text) IS
  'US-305. SECURITY DEFINER, so it bypasses RLS on documents and document_versions; the company check at the top is the only thing standing between a caller and another company''s document. Do not remove it.';
