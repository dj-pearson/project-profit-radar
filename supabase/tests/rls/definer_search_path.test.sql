-- US-353: pinning search_path stops a caller shadowing a definer function's
-- tables from pg_temp, and leaves normal resolution alone.

CREATE TABLE public.secrets (v text);
INSERT INTO public.secrets VALUES ('real');
CREATE FUNCTION public.read_secret() RETURNS text LANGUAGE sql SECURITY DEFINER
  AS $$ SELECT v FROM secrets LIMIT 1 $$;
CREATE FUNCTION public.already_pinned() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = ''
  AS $$ SELECT 'x' $$;
GRANT EXECUTE ON FUNCTION public.read_secret() TO authenticated;

-- Before: pg_temp is searched first for relations, so the caller's temp table wins.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
CREATE TEMP TABLE secrets (v text);
INSERT INTO secrets VALUES ('attacker');
SELECT test_assert(public.read_secret() = 'attacker', 'before the pin, a temp table shadows the definer function''s table');
ROLLBACK;

\i supabase/migrations/20260923030000_pin_definer_search_path.sql

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
CREATE TEMP TABLE secrets (v text);
INSERT INTO secrets VALUES ('attacker');
SELECT test_assert(public.read_secret() = 'real', 'after the pin, the function reads public.secrets');
ROLLBACK;

SELECT test_assert(
  (SELECT proconfig FROM pg_proc WHERE proname = 'already_pinned') = ARRAY['search_path=""'],
  'a function that already pinned its path is left as it was');
SELECT test_assert(
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')) = 0,
  'no definer function in public is left unpinned');
