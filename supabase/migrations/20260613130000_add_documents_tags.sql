-- Add a tags array to documents (US-091 "Tag Selected" bulk action).
--
-- Additive and backward-compatible: a new NULLable column with no default, so
-- existing rows are unaffected and older clients that never read/write `tags`
-- keep working (per the CLAUDE.md "ADD COLUMN nullable is always safe" rule).
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS tags text[];

-- GIN index so tag filtering/contains queries stay fast as the column is used.
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING gin (tags);
