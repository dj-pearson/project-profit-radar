-- US-091: bulk "Tag Selected" action on the documents list needs a place to
-- store free-form tags. Adding a nullable text[] column is additive and
-- backward-compatible (per CLAUDE.md "ALTER TABLE … ADD COLUMN nullable" is
-- always safe in a single migration): existing rows read as NULL, older
-- clients that never write the column are unaffected.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS tags text[];

COMMENT ON COLUMN public.documents.tags IS
  'Free-form tags applied to a document (e.g. via the bulk "Tag Selected" action). Nullable; added in US-091.';
