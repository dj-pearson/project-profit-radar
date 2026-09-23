-- seo_serp_positions.site_id, for databases built from the migration history.
--
-- check-keyword-positions and track-serp-features now write site_id (resolved
-- in supabase/functions/_shared/seo-site.ts). The live database already has
-- the column, NOT NULL, from the multi-site rollout; the generated types
-- (src/integrations/supabase/types.ts) show it with a sites foreign key. No
-- migration in this repo adds it, so a database replayed from
-- supabase/migrations has no site_id on this table and the insert would fail
-- with "column does not exist".
--
-- Additive and idempotent: added only when missing, nullable. On the live
-- database it is a no-op and the existing NOT NULL is left alone. The foreign
-- key is only created when this migration adds the column and the sites table
-- exists. No index: nothing filters this table by site_id, and a plain CREATE
-- INDEX on an existing table would lock it (check-index-concurrently). No RLS
-- change: the existing root_admin policies cover the new column.

DO $$
BEGIN
  IF to_regclass('public.seo_serp_positions') IS NULL THEN
    RAISE NOTICE 'seo_serp_positions does not exist; nothing to do';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seo_serp_positions'
      AND column_name = 'site_id'
  ) THEN
    ALTER TABLE public.seo_serp_positions ADD COLUMN site_id UUID;

    IF to_regclass('public.sites') IS NOT NULL THEN
      ALTER TABLE public.seo_serp_positions
        ADD CONSTRAINT seo_serp_positions_site_id_fkey
        FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE RESTRICT;
    END IF;
  END IF;
END $$;
