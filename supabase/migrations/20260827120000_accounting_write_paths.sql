-- Journal entries, bills and bill payments cannot be created at all (US-310).
--
-- Three call sites generate their document number the same way:
--
--   const { data: seqData, error: seqError } = await supabase
--     .rpc('nextval', { sequence_name: 'journal_entry_number_seq' });
--   if (seqError) throw seqError;
--
-- src/hooks/useAccounting.ts does it for journal_entry_number_seq and
-- bill_number_seq, src/pages/BillPayments.tsx for bill_payment_number_seq.
-- None of them can work. nextval is pg_catalog.nextval(regclass): it lives in
-- pg_catalog, which PostgREST does not expose, and it takes one regclass
-- argument, not a `sequence_name`. Either fact alone makes the call
-- unresolvable, and no migration has ever created a public wrapper. Every call
-- site throws on the error before reaching its insert, so the whole create path
-- for all three document types fails on the first statement. Found by
-- scripts/check-rpc-definitions.mjs (US-303).
--
-- The three sequences do exist - 20250707000000_enterprise_finance_module.sql
-- creates them and grants USAGE to authenticated - so only the way they are
-- reached is broken.
--
-- Fixed with the pattern this repo already uses for every other numbered
-- document (generate_po_number, generate_invoice_number, generate_estimate_number
-- and eleven more): a SECURITY DEFINER generate_* function plus a BEFORE INSERT
-- trigger that fills the column when the caller leaves it empty. That is better
-- than adding a public nextval wrapper, which would let any authenticated user
-- burn any sequence in the database by name.
--
-- Backward compatibility: the trigger only assigns when the column arrives NULL
-- or blank. A client still running the previous bundle sends a number it
-- generated itself and is unaffected - it just never gets that far, because its
-- nextval call fails first. BEFORE ROW triggers run ahead of the NOT NULL check,
-- so a new client can omit the column entirely.
--
-- Known limitation, deliberately not changed here: the sequences are global
-- while uniqueness is UNIQUE(company_id, <number>). Two companies creating
-- journal entries interleave, so each sees gaps in its own numbering. Every
-- other document type in this schema already behaves this way, so making
-- journal entries alone per-company would be inconsistent, and gap-free
-- per-company numbering needs a counter table and a decision about existing
-- rows. Auditors do test for gaps in a journal-entry sequence, so this is worth
-- deciding on rather than inheriting.

-- ---------------------------------------------------------------------------
-- generate_journal_entry_number()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN 'JE-' || LPAD(nextval('public.journal_entry_number_seq')::text, 6, '0');
END;
$function$;

COMMENT ON FUNCTION public.generate_journal_entry_number() IS
  'US-310. Returns the next journal entry number. SECURITY DEFINER so the sequence is reached without granting clients a way to advance arbitrary sequences by name, which a public nextval wrapper would.';

REVOKE ALL ON FUNCTION public.generate_journal_entry_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_journal_entry_number() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- generate_bill_number()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_bill_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN 'BILL-' || LPAD(nextval('public.bill_number_seq')::text, 6, '0');
END;
$function$;

COMMENT ON FUNCTION public.generate_bill_number() IS
  'US-310. Returns the next vendor bill number. See generate_journal_entry_number for why this is SECURITY DEFINER rather than a public nextval wrapper.';

REVOKE ALL ON FUNCTION public.generate_bill_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_bill_number() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- generate_bill_payment_number()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_bill_payment_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN 'PMT-' || LPAD(nextval('public.bill_payment_number_seq')::text, 6, '0');
END;
$function$;

COMMENT ON FUNCTION public.generate_bill_payment_number() IS
  'US-310. Returns the next bill payment number. See generate_journal_entry_number for why this is SECURITY DEFINER rather than a public nextval wrapper.';

REVOKE ALL ON FUNCTION public.generate_bill_payment_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_bill_payment_number() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
-- NULLIF(trim(...), '') rather than a bare NULL check: the column is
-- VARCHAR NOT NULL, and a client sending an empty string would otherwise store
-- a document with a blank number that still satisfies the constraint.
CREATE OR REPLACE FUNCTION public.set_journal_entry_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NULLIF(trim(COALESCE(NEW.entry_number, '')), '') IS NULL THEN
    NEW.entry_number := public.generate_journal_entry_number();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_bill_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NULLIF(trim(COALESCE(NEW.bill_number, '')), '') IS NULL THEN
    NEW.bill_number := public.generate_bill_number();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_bill_payment_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NULLIF(trim(COALESCE(NEW.payment_number, '')), '') IS NULL THEN
    NEW.payment_number := public.generate_bill_payment_number();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_journal_entry_number_trigger ON public.journal_entries;
CREATE TRIGGER set_journal_entry_number_trigger
  BEFORE INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_journal_entry_number();

DROP TRIGGER IF EXISTS set_bill_number_trigger ON public.bills;
CREATE TRIGGER set_bill_number_trigger
  BEFORE INSERT ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.set_bill_number();

DROP TRIGGER IF EXISTS set_bill_payment_number_trigger ON public.bill_payments;
CREATE TRIGGER set_bill_payment_number_trigger
  BEFORE INSERT ON public.bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_bill_payment_number();

-- ---------------------------------------------------------------------------
-- apply_bill_payment(uuid, numeric)
-- ---------------------------------------------------------------------------
-- src/pages/BillPayments.tsx has always called this to move a bill's balance
-- after a payment, and no migration has ever defined it. Until the numbering
-- fix above, that did not matter: the mutation threw on its nextval call before
-- reaching this point, so no payment could be recorded and the fallback never
-- ran. Making payments possible makes the fallback the live path, and the
-- fallback reads amount_paid from the client's loaded copy of the bill and
-- writes back the sum. Two payments applied to the same bill at once both read
-- the same amount_paid and both write the same total, so one of them is lost -
-- silently, in a ledger.
--
-- Doing the read-modify-write inside one UPDATE keeps it under the row lock the
-- UPDATE itself takes, so concurrent callers serialise. The right-hand
-- references to amount_paid are the pre-update value, which is what the status
-- decision needs.
--
-- SECURITY DEFINER bypasses RLS, so tenancy is enforced here with
-- user_in_company (which also requires the profile to be active). A bill in
-- another company reports as not found rather than as forbidden: confirming
-- that a given bill id exists is itself a leak. EXECUTE goes to authenticated
-- only - the check keys on auth.uid(), which is null for service_role, so
-- granting it there would produce a function that always refuses.
--
-- Overpayment is allowed through: bills.amount_due is
-- GENERATED ALWAYS AS (total_amount - amount_paid), so an overpayment shows as
-- a negative amount due, which is a credit and a real thing that happens.
CREATE OR REPLACE FUNCTION public.apply_bill_payment(
  p_bill_id uuid,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_paid numeric;
BEGIN
  IF p_bill_id IS NULL OR p_amount IS NULL THEN
    RAISE EXCEPTION 'bill id and amount are required' USING ERRCODE = '22023';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'payment amount must be positive' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bills
     SET amount_paid = COALESCE(amount_paid, 0) + p_amount,
         status = CASE
                    -- A voided or draft bill does not become paid because money
                    -- was applied to it; that needs a human.
                    WHEN status IN ('void', 'draft') THEN status
                    WHEN COALESCE(amount_paid, 0) + p_amount >= total_amount THEN 'paid'
                    ELSE 'partial'
                  END,
         updated_at = now()
   WHERE id = p_bill_id
     AND public.user_in_company(company_id)
  RETURNING amount_paid INTO v_paid;

  IF v_paid IS NULL THEN
    RAISE EXCEPTION 'bill not found' USING ERRCODE = '02000';
  END IF;

  RETURN v_paid;
END;
$function$;

COMMENT ON FUNCTION public.apply_bill_payment(uuid, numeric) IS
  'US-310. Applies a payment amount to a bill and updates its status, returning the new amount_paid. Called by src/pages/BillPayments.tsx, which had no such function and fell back to a client-side read-modify-write that loses one of two concurrent payments. Doing it in one UPDATE keeps the read and the write under the same row lock. SECURITY DEFINER bypasses RLS, so tenancy is enforced with user_in_company; a bill in another company reports as not found, because confirming a bill id exists is itself a leak.';

REVOKE ALL ON FUNCTION public.apply_bill_payment(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_bill_payment(uuid, numeric) TO authenticated;
