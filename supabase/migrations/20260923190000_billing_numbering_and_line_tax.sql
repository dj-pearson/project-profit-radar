-- Finish what 20260903210000 started for US-332: numbering that cannot be
-- abused or collide, change orders and purchase orders on the same counter,
-- and somewhere to keep a per-line tax rate.
--
-- WHAT WAS WRONG WITH THE FIRST PASS
--
--   next_document_number(p_company_id, ...) is SECURITY DEFINER and granted to
--   authenticated, and it never looked at who was calling. Any signed-in user
--   could call /rest/v1/rpc/next_document_number with another company's id and
--   burn that company's invoice numbers - a permanent gap in someone else's
--   sequence, which is exactly what the counter exists to prevent - and read
--   back its prefix while doing it.
--
--   The settings page could rewind next_number. A counter set back from 42 to
--   40 mints 40 and 41 a second time.
--
--   invoices.invoice_number is UNIQUE across the whole table (20250703173410),
--   and purchase_orders.po_number may be too (20250115000004). With per-company
--   numbering, the second company to pick the prefix "INV-" gets a unique
--   violation on its first invoice. Uniqueness belongs to (company_id, number),
--   which is what estimates already had (20250712210005).
--
--   Change orders and purchase orders were listed as numbered document types
--   and nothing read their counters.
--
-- Additive for clients: every RPC keeps its signature, every column added is
-- nullable or defaulted, and a company that has not configured numbering gets
-- exactly the numbers it got before.

-- ---------------------------------------------------------------------------
-- 1. next_document_number checks its caller
-- ---------------------------------------------------------------------------
-- The triggers below call it as the inserting user, so auth.uid() is that user
-- and the check is the same one RLS makes. With no JWT subject (service_role,
-- or a migration) there is no caller to check, and those paths are trusted.
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
  v_caller   uuid := auth.uid();
  v_settings public.document_number_settings;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_caller IS NOT NULL
     AND p_company_id IS DISTINCT FROM public.get_user_company(v_caller)
     AND public.get_user_role(v_caller)::text IS DISTINCT FROM 'root_admin' THEN
    RAISE EXCEPTION 'Cannot take a document number for another company'
      USING ERRCODE = '42501';
  END IF;

  -- Lock first, then read and advance. Concurrent callers queue on this row
  -- and each sees the value the previous one left.
  SELECT * INTO v_settings
    FROM public.document_number_settings
   WHERE company_id = p_company_id AND doc_type = p_doc_type
     FOR UPDATE;

  -- Not configured: the caller keeps whatever it did before.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.document_number_settings
     SET next_number = v_settings.next_number + 1
   WHERE company_id = p_company_id AND doc_type = p_doc_type;

  RETURN v_settings.prefix
      || CASE WHEN v_settings.include_year
              THEN to_char(CURRENT_DATE, 'YYYY') || '-'
              ELSE '' END
      || lpad(v_settings.next_number::text, v_settings.pad_width, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_document_number(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_document_number(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. The counter only moves forward
-- ---------------------------------------------------------------------------
-- Moving it forward (skipping to 1000 to start a new year, say) is a choice an
-- owner can make. Moving it back re-issues numbers that are already on
-- documents a customer holds.
CREATE OR REPLACE FUNCTION public.document_number_settings_forward_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.next_number < OLD.next_number THEN
    RAISE EXCEPTION 'Numbering can only move forward: % numbers up to % have already been issued',
      OLD.doc_type, OLD.next_number - 1
      USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS document_number_settings_forward_only ON public.document_number_settings;
CREATE TRIGGER document_number_settings_forward_only
  BEFORE UPDATE ON public.document_number_settings
  FOR EACH ROW EXECUTE FUNCTION public.document_number_settings_forward_only();

-- ---------------------------------------------------------------------------
-- 3. Document numbers are unique per company, not per table
-- ---------------------------------------------------------------------------
-- Moved to 20260923190001 (the per-company unique indexes, built
-- CONCURRENTLY so invoices and purchase_orders are not locked) and
-- 20260923190002 (dropping the table-wide constraints once those exist).

-- ---------------------------------------------------------------------------
-- 4. Purchase orders and change orders use the counter
-- ---------------------------------------------------------------------------
-- Same shape as set_invoice_number: configured numbering where there is some,
-- exactly the old sequence where not.
CREATE OR REPLACE FUNCTION public.set_po_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := COALESCE(
      public.next_document_number(NEW.company_id, 'purchase_order'),
      public.generate_po_number(NEW.company_id));
  END IF;
  RETURN NEW;
END;
$$;

-- Change orders never had a trigger: the number is made in the browser
-- (`CO-` plus a timestamp in ChangeOrderManagement) or in the change-orders
-- edge function (`CO-001` per project). Neither is something a person typed,
-- so when the company has configured numbering the counter replaces it. When
-- it has not, the supplied number stands, as it always has.
CREATE OR REPLACE FUNCTION public.set_change_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_number  text;
BEGIN
  v_company := COALESCE(
    NEW.company_id,
    (SELECT p.company_id FROM public.projects p WHERE p.id = NEW.project_id));

  v_number := public.next_document_number(v_company, 'change_order');
  IF v_number IS NOT NULL THEN
    NEW.change_order_number := v_number;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.change_orders') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS set_change_order_number_trigger ON public.change_orders;
    CREATE TRIGGER set_change_order_number_trigger
      BEFORE INSERT ON public.change_orders
      FOR EACH ROW EXECUTE FUNCTION public.set_change_order_number();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Per-line tax
-- ---------------------------------------------------------------------------
-- NULL tax_rate means "the document's rate", so every existing line keeps
-- meaning what it meant. taxable defaults true for the same reason.
ALTER TABLE public.invoice_line_items
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,3)
    CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 100)),
  ADD COLUMN IF NOT EXISTS taxable BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.estimate_line_items
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,3)
    CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 100)),
  ADD COLUMN IF NOT EXISTS taxable BOOLEAN NOT NULL DEFAULT true;

-- Estimates stored a percentage and let every reader recompute the tax, and the
-- form and the PDF computed it on different bases (the PDF subtracted the
-- discount first). With per-line rates there is no single percentage to
-- recompute from, so the amount the form showed is what gets stored and
-- printed.
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14,2);

COMMENT ON COLUMN public.invoice_line_items.tax_rate IS
  'Percent for this line. NULL means the invoice rate applies. US-332.';
COMMENT ON COLUMN public.estimate_line_items.tax_rate IS
  'Percent for this line. NULL means the estimate rate applies. US-332.';
COMMENT ON COLUMN public.estimates.tax_amount IS
  'Tax as computed when the estimate was saved, per line and rounded per rate. NULL on estimates saved before US-332. US-332.';
