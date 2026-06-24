-- US-101: link invoices back to the estimate they were converted from.
--
-- Additive nullable column (the "always safe" path per CLAUDE.md). Lets the
-- estimate-to-invoice conversion record provenance and lets an estimate list
-- the invoices billed against it. Older clients that never read/write
-- `estimate_id` are unaffected.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_estimate_id
  ON public.invoices (estimate_id)
  WHERE estimate_id IS NOT NULL;
