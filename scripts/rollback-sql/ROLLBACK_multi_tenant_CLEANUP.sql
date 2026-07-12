-- ============================================================================
-- MULTI-TENANT ROLLBACK - CLEANUP PHASE 2
-- ============================================================================
-- This migration cleans up remaining site_id columns and policies that were
-- not handled by the first rollback migration.
--
-- Run this AFTER ROLLBACK_multi_tenant.sql
-- ============================================================================

-- Step 1: Drop all policies that reference site_id
-- ============================================================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Loop through all policies and drop those containing 'site' in their name
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE policyname ILIKE '%site%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE',
            pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy: % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    END LOOP;
END $$;

-- Step 2: Drop all site_id columns with CASCADE
-- ============================================================================

DO $$
DECLARE
    tbl RECORD;
BEGIN
    -- Loop through all tables with site_id column and drop with CASCADE
    FOR tbl IN 
        SELECT table_schema, table_name
        FROM information_schema.columns
        WHERE column_name = 'site_id'
          AND table_schema = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I.%I DROP COLUMN IF EXISTS site_id CASCADE',
                tbl.table_schema, tbl.table_name);
            RAISE NOTICE 'Dropped site_id from %.%', tbl.table_schema, tbl.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not drop site_id from %.%: %', tbl.table_schema, tbl.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 3: Final verification
-- ============================================================================

DO $$
DECLARE
  site_id_count INTEGER;
  sites_table_count INTEGER;
BEGIN
  -- Check for remaining site_id columns
  SELECT COUNT(*)
  INTO site_id_count
  FROM information_schema.columns
  WHERE column_name = 'site_id'
    AND table_schema = 'public';
  
  -- Check for sites table
  SELECT COUNT(*)
  INTO sites_table_count
  FROM information_schema.tables
  WHERE table_name = 'sites'
    AND table_schema = 'public';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP PHASE 2 COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Remaining tables with site_id: %', site_id_count;
  RAISE NOTICE 'Sites table exists: %', sites_table_count;
  RAISE NOTICE 'Expected values: 0 for both';
  
  IF site_id_count = 0 AND sites_table_count = 0 THEN
    RAISE NOTICE '✅ Full rollback successful!';
  ELSE
    RAISE WARNING '⚠️  Some cleanup may still be needed';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Step 4: List any remaining site-related policies (for manual review)
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    'Manual review needed' as note
FROM pg_policies
WHERE policyname ILIKE '%site%'
ORDER BY tablename, policyname;

-- Step 5: List any remaining site_id columns (for manual review)
-- ============================================================================

SELECT 
    table_schema,
    table_name,
    column_name,
    'Manual cleanup needed' as note
FROM information_schema.columns
WHERE column_name = 'site_id'
  AND table_schema = 'public'
ORDER BY table_name;

