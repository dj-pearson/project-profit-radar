-- Two finance views showed every company's numbers to every signed-in user.
--
-- quickbooks_sync_health (20260903230000, US-333) and ledger_account_activity
-- (20260903250000, US-334) are plain views granted SELECT to authenticated. A
-- plain view runs with its owner's rights, and the owner is the migration
-- role, which RLS does not apply to. Neither view filters by company. So the
-- RLS on quickbooks_sync_review and on journal_entries / journal_entry_lines /
-- chart_of_accounts never ran for a read through the view, and any
-- authenticated user could select:
--
--   - every company's QuickBooks review-queue counts and pending dollar
--     amounts, and
--   - every company's posted ledger movement per account per day, which is
--     their P&L and balance sheet.
--
-- The one reader in src/ (useLedgerActivity in src/hooks/useAccounting.ts)
-- filters .eq('company_id', <own company>), which is why the pages looked
-- right. The filter is the client's choice, not a boundary.
--
-- security_invoker makes the view run as the caller, so the base tables' RLS
-- applies. For the legitimate reader nothing changes: those policies already
-- let a user see their own company's rows, which is all the page asks for.
-- What stops working is reading another company's rows, which was never
-- meant to work. That is why this is not the "tightening a policy" case the
-- multi-release rule guards: no shipped client depends on the cross-company
-- read (nothing in src/ or Brikly-iOS reads quickbooks_sync_health at all).
--
-- Guarded, so it applies cleanly wherever either view has not been created.
-- Proven on real Postgres in supabase/tests/rls/quickbooks_sync_import.test.sql.

DO $$
BEGIN
  IF to_regclass('public.quickbooks_sync_health') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.quickbooks_sync_health SET (security_invoker = true)';
  END IF;
  IF to_regclass('public.ledger_account_activity') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.ledger_account_activity SET (security_invoker = true)';
  END IF;
END $$;
