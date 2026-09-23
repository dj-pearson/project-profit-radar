-- Pin search_path on every SECURITY DEFINER function that lacks one (US-353).
--
-- scripts/check-definer-search-path.mjs counted 123 definer functions whose
-- latest definition sets no search_path. Such a function resolves unqualified
-- names through the CALLER's search_path while running with the owner's
-- rights; with pg_temp searched first for relations by default, a caller can
-- shadow a table the function reads.
--
-- This works from pg_proc rather than from the migration files, so it covers
-- exactly what is live, including functions created outside migrations.
--
-- The value is the path those functions already resolved through for a
-- normal caller: Supabase gives API roles "$user", public, extensions, and no
-- role-named schemas exist here. So bodies that relied on public or on an
-- extension function (pgcrypto's pgp_sym_encrypt lives in extensions) resolve
-- the same way as before. The one change is pg_temp, listed last so it can no
-- longer shadow anything. No body is rewritten.

DO $$
DECLARE
  fn record;
  n integer := 0;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public'
       AND p.prosecdef
       AND NOT EXISTS (
         SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) c WHERE c LIKE 'search_path=%'
       )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', fn.sig);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'US-353: pinned search_path on % SECURITY DEFINER function(s)', n;
END $$;
