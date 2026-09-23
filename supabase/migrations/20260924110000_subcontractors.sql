-- A real subcontractor list behind /subcontractors (US-405).
--
-- src/pages/Subcontractors.tsx was a local-state mock end to end: five invented
-- vendor companies, an add form that pushed into an array, and a certificate
-- "upload" that made up a General Liability cert expiring in exactly a year.
-- No migration created a subcontractors table (subcontractor_disclosures and
-- subcontractor_payments are unrelated), so nothing could have persisted.
--
-- Three pieces, all new, so the whole file is additive:
--
--   subcontractors                        one row per vendor, per company.
--   subcontractor_insurance_certificates  one row per uploaded certificate;
--                                         its expires_on drives the page's
--                                         valid / expiring / expired filter.
--   storage bucket subcontractor-documents
--                                         private, company-first paths:
--                                         <company_id>/<subcontractor_id>/<file>.
--
-- Read access excludes client_portal. A customer with a portal login is a
-- member of the contractor's company for get_user_company purposes, and the
-- vendor list - who the contractor uses, their licence numbers, the notes kept
-- on them - is not something the customer should see.
--
-- Writes are limited to the roles that run the office side of a job. Field
-- roles read the list (a superintendent needs the sub's phone number) but do
-- not rate or prequalify vendors. Policy style follows
-- 20260903210000_company_billing_settings.sql: separate read and manage
-- policies, TO authenticated, and WITH CHECK mirroring USING, because a FOR ALL
-- with only USING lets a client insert a row into another company.

-- ---------------------------------------------------------------------------
-- 1. subcontractors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  trade TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  -- 0 means unrated, so a new vendor is not shown as a one-star vendor.
  rating SMALLINT NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  notes TEXT,
  -- Per-vendor checklist state keyed by item (see SUBCONTRACTOR_PREQUALIFICATION
  -- in src/lib/subcontractors.ts), e.g. {"business_license": true}. jsonb
  -- rather than eight columns because the checklist is never queried across
  -- rows; a missing key means "not checked".
  prequalification JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(prequalification) = 'object'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Target of the composite foreign key below, which is what stops a
  -- certificate from pointing at another company's subcontractor.
  UNIQUE (id, company_id)
);

COMMENT ON TABLE public.subcontractors IS
  'A company''s subcontractor / vendor list with rating and prequalification checklist. Hidden from client_portal. US-405.';

CREATE INDEX IF NOT EXISTS idx_subcontractors_company
  ON public.subcontractors (company_id, name);

ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subcontractors' AND policyname = 'Staff read their company subcontractors'
  ) THEN
    CREATE POLICY "Staff read their company subcontractors"
      ON public.subcontractors FOR SELECT
      TO authenticated
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid())::text <> 'client_portal'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subcontractors' AND policyname = 'Office staff manage their company subcontractors'
  ) THEN
    CREATE POLICY "Office staff manage their company subcontractors"
      ON public.subcontractors FOR ALL
      TO authenticated
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid())::text = ANY (
          ARRAY['root_admin', 'admin', 'project_manager', 'office_staff'])
      )
      WITH CHECK (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid())::text = ANY (
          ARRAY['root_admin', 'admin', 'project_manager', 'office_staff'])
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.touch_subcontractors_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_subcontractors_updated_at ON public.subcontractors;
CREATE TRIGGER touch_subcontractors_updated_at
  BEFORE UPDATE ON public.subcontractors
  FOR EACH ROW EXECUTE FUNCTION public.touch_subcontractors_updated_at();

-- ---------------------------------------------------------------------------
-- 2. subcontractor_insurance_certificates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcontractor_insurance_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL,
  coverage_type TEXT NOT NULL CHECK (length(btrim(coverage_type)) > 0),
  -- Object path inside the subcontractor-documents bucket, never a URL. The
  -- page signs it at click time (src/lib/storage/signedUrl.ts).
  file_path TEXT NOT NULL,
  file_name TEXT,
  expires_on DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (subcontractor_id, company_id)
    REFERENCES public.subcontractors (id, company_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.subcontractor_insurance_certificates IS
  'Insurance certificates per subcontractor. expires_on drives the valid/expiring/expired status on /subcontractors. File lives in the private subcontractor-documents bucket. US-405.';

CREATE INDEX IF NOT EXISTS idx_subcontractor_certs_subcontractor
  ON public.subcontractor_insurance_certificates (subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_subcontractor_certs_company_expiry
  ON public.subcontractor_insurance_certificates (company_id, expires_on);

ALTER TABLE public.subcontractor_insurance_certificates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subcontractor_insurance_certificates'
      AND policyname = 'Staff read their company subcontractor certificates'
  ) THEN
    CREATE POLICY "Staff read their company subcontractor certificates"
      ON public.subcontractor_insurance_certificates FOR SELECT
      TO authenticated
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid())::text <> 'client_portal'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subcontractor_insurance_certificates'
      AND policyname = 'Office staff manage their company subcontractor certificates'
  ) THEN
    CREATE POLICY "Office staff manage their company subcontractor certificates"
      ON public.subcontractor_insurance_certificates FOR ALL
      TO authenticated
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid())::text = ANY (
          ARRAY['root_admin', 'admin', 'project_manager', 'office_staff'])
      )
      WITH CHECK (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid())::text = ANY (
          ARRAY['root_admin', 'admin', 'project_manager', 'office_staff'])
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Private bucket for the certificate files
-- ---------------------------------------------------------------------------
-- Private from creation. A public bucket bypasses storage.objects RLS on the
-- /object/public/ path (the US-289 lesson), and a certificate carries policy
-- numbers and the vendor's insurer.
INSERT INTO storage.buckets (id, name, public)
VALUES ('subcontractor-documents', 'subcontractor-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Staff read their company subcontractor documents'
  ) THEN
    CREATE POLICY "Staff read their company subcontractor documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'subcontractor-documents'
        AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
        AND public.get_user_role(auth.uid())::text <> 'client_portal'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Office staff upload their company subcontractor documents'
  ) THEN
    CREATE POLICY "Office staff upload their company subcontractor documents"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'subcontractor-documents'
        AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
        AND public.get_user_role(auth.uid())::text = ANY (
          ARRAY['root_admin', 'admin', 'project_manager', 'office_staff'])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Office staff update their company subcontractor documents'
  ) THEN
    CREATE POLICY "Office staff update their company subcontractor documents"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'subcontractor-documents'
        AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
        AND public.get_user_role(auth.uid())::text = ANY (
          ARRAY['root_admin', 'admin', 'project_manager', 'office_staff'])
      )
      WITH CHECK (
        bucket_id = 'subcontractor-documents'
        AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
        AND public.get_user_role(auth.uid())::text = ANY (
          ARRAY['root_admin', 'admin', 'project_manager', 'office_staff'])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Office staff delete their company subcontractor documents'
  ) THEN
    CREATE POLICY "Office staff delete their company subcontractor documents"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'subcontractor-documents'
        AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
        AND public.get_user_role(auth.uid())::text = ANY (
          ARRAY['root_admin', 'admin', 'project_manager', 'office_staff'])
      );
  END IF;
END $$;
