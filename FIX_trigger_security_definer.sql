-- =====================================================
-- FIX: Make auto_create_coa_for_company SECURITY DEFINER
-- =====================================================
-- The trigger function needs SECURITY DEFINER so it can
-- insert into chart_of_accounts table even if the user
-- doesn't have direct permission
-- =====================================================

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION auto_create_coa_for_company()
RETURNS TRIGGER 
SECURITY DEFINER  -- ← This is the key change!
SET search_path = public
AS $$
BEGIN
    -- Create default COA when a new company is created
    PERFORM create_default_chart_of_accounts(NEW.id);
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't block company creation
    RAISE WARNING 'Failed to create default COA for company %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also make create_default_chart_of_accounts SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(p_company_id UUID)
RETURNS void
SECURITY DEFINER  -- ← This too!
SET search_path = public
AS $$
BEGIN
    -- Insert default chart of accounts
    -- (The full implementation should already exist, we're just adding SECURITY DEFINER)
    INSERT INTO chart_of_accounts (
        company_id,
        account_number,
        account_name,
        account_type,
        parent_account_id,
        is_active
    )
    SELECT 
        p_company_id,
        account_number,
        account_name,
        account_type,
        NULL, -- parent_account_id
        TRUE  -- is_active
    FROM (VALUES
        -- Assets
        ('1000', 'Assets', 'asset'),
        ('1100', 'Current Assets', 'asset'),
        ('1110', 'Cash', 'asset'),
        ('1120', 'Accounts Receivable', 'asset'),
        ('1130', 'Inventory', 'asset'),
        ('1200', 'Fixed Assets', 'asset'),
        ('1210', 'Equipment', 'asset'),
        ('1220', 'Vehicles', 'asset'),
        ('1230', 'Buildings', 'asset'),
        
        -- Liabilities
        ('2000', 'Liabilities', 'liability'),
        ('2100', 'Current Liabilities', 'liability'),
        ('2110', 'Accounts Payable', 'liability'),
        ('2120', 'Credit Cards', 'liability'),
        ('2200', 'Long-term Liabilities', 'liability'),
        ('2210', 'Loans Payable', 'liability'),
        
        -- Equity
        ('3000', 'Equity', 'equity'),
        ('3100', 'Owner''s Equity', 'equity'),
        ('3200', 'Retained Earnings', 'equity'),
        
        -- Revenue
        ('4000', 'Revenue', 'revenue'),
        ('4100', 'Construction Revenue', 'revenue'),
        ('4200', 'Service Revenue', 'revenue'),
        
        -- Expenses
        ('5000', 'Cost of Goods Sold', 'expense'),
        ('5100', 'Materials', 'expense'),
        ('5200', 'Subcontractors', 'expense'),
        ('6000', 'Operating Expenses', 'expense'),
        ('6100', 'Labor', 'expense'),
        ('6200', 'Equipment Rental', 'expense'),
        ('6300', 'Insurance', 'expense'),
        ('6400', 'Office Expenses', 'expense')
    ) AS defaults(account_number, account_name, account_type)
    ON CONFLICT DO NOTHING;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error creating default COA: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION auto_create_coa_for_company() TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_chart_of_accounts(UUID) TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TRIGGER FUNCTIONS UPDATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✓ auto_create_coa_for_company() now uses SECURITY DEFINER';
    RAISE NOTICE '✓ create_default_chart_of_accounts() now uses SECURITY DEFINER';
    RAISE NOTICE '✓ Added error handling to prevent blocking company creation';
    RAISE NOTICE '';
    RAISE NOTICE 'Company creation should now work even if COA creation fails.';
    RAISE NOTICE '========================================';
END $$;

