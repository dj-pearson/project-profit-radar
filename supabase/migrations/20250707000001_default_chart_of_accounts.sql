-- =====================================================
-- DEFAULT CHART OF ACCOUNTS FOR CONSTRUCTION COMPANIES
-- =====================================================
-- This migration creates a default COA structure
-- Follows construction industry best practices
-- Based on standard construction accounting
-- =====================================================

-- Function to insert default COA for a company
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(p_company_id UUID)
RETURNS void AS $$
BEGIN
    -- Check if company already has accounts
    IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id) THEN
        RETURN;
    END IF;

    -- =====================================================
    -- ASSETS (1000-1999)
    -- =====================================================

    -- Current Assets (1000-1499)
    INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, account_subtype, normal_balance, is_system_account, is_bank_account, description) VALUES
    (p_company_id, '1000', 'Cash', 'asset', 'cash', 'debit', true, false, 'Petty cash and cash on hand'),
    (p_company_id, '1010', 'Operating Account', 'asset', 'bank', 'debit', true, true, 'Primary checking account'),
    (p_company_id, '1020', 'Payroll Account', 'asset', 'bank', 'debit', true, true, 'Dedicated payroll checking account'),
    (p_company_id, '1030', 'Savings Account', 'asset', 'bank', 'debit', true, true, 'Business savings account'),
    (p_company_id, '1050', 'Money Market Account', 'asset', 'bank', 'debit', false, true, 'Money market investment account'),

    -- Accounts Receivable (1100-1199)
    (p_company_id, '1100', 'Accounts Receivable', 'asset', 'accounts_receivable', 'debit', true, false, 'Customer invoices and receivables'),
    (p_company_id, '1110', 'Retainage Receivable', 'asset', 'accounts_receivable', 'debit', true, false, 'Customer retainage held on contracts'),
    (p_company_id, '1120', 'Allowance for Doubtful Accounts', 'asset', 'accounts_receivable', 'credit', false, false, 'Reserve for uncollectible accounts'),
    (p_company_id, '1130', 'Unbilled Receivables', 'asset', 'accounts_receivable', 'debit', false, false, 'Work completed but not yet invoiced'),

    -- Other Current Assets (1200-1499)
    (p_company_id, '1200', 'Inventory - Materials', 'asset', 'other_current_asset', 'debit', false, false, 'Construction materials inventory'),
    (p_company_id, '1210', 'Inventory - Tools & Supplies', 'asset', 'other_current_asset', 'debit', false, false, 'Small tools and supplies'),
    (p_company_id, '1300', 'Prepaid Insurance', 'asset', 'other_current_asset', 'debit', false, false, 'Prepaid insurance premiums'),
    (p_company_id, '1310', 'Prepaid Rent', 'asset', 'other_current_asset', 'debit', false, false, 'Prepaid office/yard rent'),
    (p_company_id, '1320', 'Prepaid Equipment Leases', 'asset', 'other_current_asset', 'debit', false, false, 'Prepaid equipment lease payments'),
    (p_company_id, '1400', 'Employee Advances', 'asset', 'other_current_asset', 'debit', false, false, 'Advances paid to employees'),
    (p_company_id, '1410', 'Vendor Deposits', 'asset', 'other_current_asset', 'debit', false, false, 'Deposits paid to vendors'),

    -- Fixed Assets (1500-1799)
    (p_company_id, '1500', 'Land', 'asset', 'fixed_asset', 'debit', false, false, 'Land and property'),
    (p_company_id, '1510', 'Buildings', 'asset', 'fixed_asset', 'debit', false, false, 'Office and warehouse buildings'),
    (p_company_id, '1520', 'Accumulated Depreciation - Buildings', 'asset', 'accumulated_depreciation', 'credit', false, false, 'Depreciation on buildings'),
    (p_company_id, '1600', 'Vehicles', 'asset', 'fixed_asset', 'debit', false, false, 'Trucks and company vehicles'),
    (p_company_id, '1610', 'Accumulated Depreciation - Vehicles', 'asset', 'accumulated_depreciation', 'credit', false, false, 'Depreciation on vehicles'),
    (p_company_id, '1700', 'Equipment', 'asset', 'fixed_asset', 'debit', false, false, 'Construction equipment and machinery'),
    (p_company_id, '1710', 'Accumulated Depreciation - Equipment', 'asset', 'accumulated_depreciation', 'credit', false, false, 'Depreciation on equipment'),
    (p_company_id, '1720', 'Furniture & Fixtures', 'asset', 'fixed_asset', 'debit', false, false, 'Office furniture and fixtures'),
    (p_company_id, '1730', 'Accumulated Depreciation - Furniture', 'asset', 'accumulated_depreciation', 'credit', false, false, 'Depreciation on furniture'),
    (p_company_id, '1740', 'Computer Equipment', 'asset', 'fixed_asset', 'debit', false, false, 'Computers and IT equipment'),
    (p_company_id, '1750', 'Accumulated Depreciation - Computers', 'asset', 'accumulated_depreciation', 'credit', false, false, 'Depreciation on computer equipment'),

    -- Other Assets (1800-1999)
    (p_company_id, '1800', 'Security Deposits', 'asset', 'other_asset', 'debit', false, false, 'Security deposits paid'),
    (p_company_id, '1810', 'Licenses & Permits', 'asset', 'other_asset', 'debit', false, false, 'Business licenses and permits'),
    (p_company_id, '1820', 'Goodwill', 'asset', 'other_asset', 'debit', false, false, 'Goodwill and intangible assets');

    -- =====================================================
    -- LIABILITIES (2000-2999)
    -- =====================================================

    -- Current Liabilities (2000-2499)
    INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, account_subtype, normal_balance, is_system_account, description) VALUES
    (p_company_id, '2000', 'Accounts Payable', 'liability', 'accounts_payable', 'credit', true, 'Vendor bills payable'),
    (p_company_id, '2010', 'Retainage Payable', 'liability', 'accounts_payable', 'credit', true, 'Subcontractor retainage held'),
    (p_company_id, '2100', 'Credit Cards Payable', 'liability', 'credit_card', 'credit', false, 'Company credit card balances'),
    (p_company_id, '2200', 'Sales Tax Payable', 'liability', 'other_current_liability', 'credit', true, 'Sales tax collected but not remitted'),
    (p_company_id, '2210', 'Payroll Tax Payable', 'liability', 'other_current_liability', 'credit', true, 'Payroll taxes withheld'),
    (p_company_id, '2220', 'Federal Income Tax Payable', 'liability', 'other_current_liability', 'credit', false, 'Federal income tax payable'),
    (p_company_id, '2230', 'State Income Tax Payable', 'liability', 'other_current_liability', 'credit', false, 'State income tax payable'),
    (p_company_id, '2300', 'Accrued Wages', 'liability', 'other_current_liability', 'credit', false, 'Wages earned but not paid'),
    (p_company_id, '2310', 'Accrued Benefits', 'liability', 'other_current_liability', 'credit', false, 'Benefits accrued but not paid'),
    (p_company_id, '2320', 'Accrued Vacation', 'liability', 'other_current_liability', 'credit', false, 'Vacation time accrued'),
    (p_company_id, '2400', 'Customer Deposits', 'liability', 'other_current_liability', 'credit', false, 'Advance payments from customers'),
    (p_company_id, '2410', 'Unearned Revenue', 'liability', 'other_current_liability', 'credit', false, 'Payments received for future work'),
    (p_company_id, '2500', 'Line of Credit', 'liability', 'other_current_liability', 'credit', false, 'Business line of credit'),

    -- Long-term Liabilities (2600-2999)
    (p_company_id, '2600', 'Notes Payable - Long Term', 'liability', 'long_term_liability', 'credit', false, 'Long-term notes and loans'),
    (p_company_id, '2700', 'Equipment Loans', 'liability', 'long_term_liability', 'credit', false, 'Equipment financing'),
    (p_company_id, '2800', 'Vehicle Loans', 'liability', 'long_term_liability', 'credit', false, 'Vehicle financing'),
    (p_company_id, '2900', 'Mortgage Payable', 'liability', 'long_term_liability', 'credit', false, 'Real estate mortgage');

    -- =====================================================
    -- EQUITY (3000-3999)
    -- =====================================================

    INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, account_subtype, normal_balance, is_system_account, description) VALUES
    (p_company_id, '3000', 'Owner''s Equity', 'equity', 'equity', 'credit', true, 'Owner investment in the business'),
    (p_company_id, '3100', 'Owner''s Draw', 'equity', 'owners_draw', 'debit', false, 'Owner withdrawals'),
    (p_company_id, '3200', 'Retained Earnings', 'equity', 'retained_earnings', 'credit', true, 'Accumulated profits from prior years'),
    (p_company_id, '3900', 'Current Year Earnings', 'equity', 'retained_earnings', 'credit', true, 'Net income for current year');

    -- =====================================================
    -- REVENUE (4000-4999)
    -- =====================================================

    INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, account_subtype, normal_balance, is_system_account, is_job_cost_account, description) VALUES
    -- Contract Revenue
    (p_company_id, '4000', 'Construction Revenue', 'revenue', 'service_revenue', 'credit', true, true, 'Revenue from construction contracts'),
    (p_company_id, '4010', 'Commercial Construction', 'revenue', 'service_revenue', 'credit', false, true, 'Commercial building projects'),
    (p_company_id, '4020', 'Residential Construction', 'revenue', 'service_revenue', 'credit', false, true, 'Residential building projects'),
    (p_company_id, '4030', 'Remodeling & Renovation', 'revenue', 'service_revenue', 'credit', false, true, 'Remodeling projects'),
    (p_company_id, '4040', 'Tenant Improvements', 'revenue', 'service_revenue', 'credit', false, true, 'TI projects'),
    (p_company_id, '4100', 'Service & Repair Revenue', 'revenue', 'service_revenue', 'credit', false, true, 'Service and repair work'),
    (p_company_id, '4200', 'Change Order Revenue', 'revenue', 'service_revenue', 'credit', false, true, 'Revenue from change orders'),

    -- Other Income
    (p_company_id, '4800', 'Interest Income', 'revenue', 'other_revenue', 'credit', false, false, 'Interest earned'),
    (p_company_id, '4900', 'Other Income', 'revenue', 'other_revenue', 'credit', false, false, 'Miscellaneous income');

    -- =====================================================
    -- COST OF GOODS SOLD (5000-5999)
    -- =====================================================

    INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, account_subtype, normal_balance, is_system_account, is_job_cost_account, description) VALUES
    -- Direct Labor
    (p_company_id, '5000', 'Direct Labor', 'cost_of_goods_sold', 'direct_labor', 'debit', true, true, 'Direct labor costs'),
    (p_company_id, '5010', 'Field Labor - Wages', 'cost_of_goods_sold', 'direct_labor', 'debit', false, true, 'Field employee wages'),
    (p_company_id, '5020', 'Field Labor - Payroll Taxes', 'cost_of_goods_sold', 'direct_labor', 'debit', false, true, 'Payroll taxes on field labor'),
    (p_company_id, '5030', 'Field Labor - Benefits', 'cost_of_goods_sold', 'direct_labor', 'debit', false, true, 'Benefits for field employees'),
    (p_company_id, '5040', 'Field Labor - Workers Comp', 'cost_of_goods_sold', 'direct_labor', 'debit', false, true, 'Workers compensation insurance'),

    -- Materials
    (p_company_id, '5100', 'Direct Materials', 'cost_of_goods_sold', 'direct_materials', 'debit', true, true, 'Direct materials costs'),
    (p_company_id, '5110', 'Lumber & Framing Materials', 'cost_of_goods_sold', 'direct_materials', 'debit', false, true, 'Lumber and framing supplies'),
    (p_company_id, '5120', 'Concrete & Masonry', 'cost_of_goods_sold', 'direct_materials', 'debit', false, true, 'Concrete, cement, blocks'),
    (p_company_id, '5130', 'Drywall & Insulation', 'cost_of_goods_sold', 'direct_materials', 'debit', false, true, 'Drywall and insulation materials'),
    (p_company_id, '5140', 'Roofing Materials', 'cost_of_goods_sold', 'direct_materials', 'debit', false, true, 'Roofing supplies'),
    (p_company_id, '5150', 'Plumbing Materials', 'cost_of_goods_sold', 'direct_materials', 'debit', false, true, 'Plumbing fixtures and supplies'),
    (p_company_id, '5160', 'Electrical Materials', 'cost_of_goods_sold', 'direct_materials', 'debit', false, true, 'Electrical supplies'),
    (p_company_id, '5170', 'HVAC Materials', 'cost_of_goods_sold', 'direct_materials', 'debit', false, true, 'HVAC equipment and supplies'),
    (p_company_id, '5180', 'Paint & Finishes', 'cost_of_goods_sold', 'direct_materials', 'debit', false, true, 'Paint and finishing materials'),
    (p_company_id, '5190', 'Hardware & Fasteners', 'cost_of_goods_sold', 'direct_materials', 'debit', false, true, 'Hardware and fasteners'),

    -- Subcontractors
    (p_company_id, '5200', 'Subcontractor Costs', 'cost_of_goods_sold', 'subcontractors', 'debit', true, true, 'Subcontractor expenses'),
    (p_company_id, '5210', 'Excavation & Grading', 'cost_of_goods_sold', 'subcontractors', 'debit', false, true, 'Excavation subcontractors'),
    (p_company_id, '5220', 'Concrete Subcontractors', 'cost_of_goods_sold', 'subcontractors', 'debit', false, true, 'Concrete work'),
    (p_company_id, '5230', 'Framing Subcontractors', 'cost_of_goods_sold', 'subcontractors', 'debit', false, true, 'Framing labor'),
    (p_company_id, '5240', 'Roofing Subcontractors', 'cost_of_goods_sold', 'subcontractors', 'debit', false, true, 'Roofing labor'),
    (p_company_id, '5250', 'Plumbing Subcontractors', 'cost_of_goods_sold', 'subcontractors', 'debit', false, true, 'Plumbing work'),
    (p_company_id, '5260', 'Electrical Subcontractors', 'cost_of_goods_sold', 'subcontractors', 'debit', false, true, 'Electrical work'),
    (p_company_id, '5270', 'HVAC Subcontractors', 'cost_of_goods_sold', 'subcontractors', 'debit', false, true, 'HVAC installation'),
    (p_company_id, '5280', 'Drywall Subcontractors', 'cost_of_goods_sold', 'subcontractors', 'debit', false, true, 'Drywall installation'),
    (p_company_id, '5290', 'Painting Subcontractors', 'cost_of_goods_sold', 'subcontractors', 'debit', false, true, 'Painting labor'),

    -- Equipment Costs
    (p_company_id, '5300', 'Equipment Costs', 'cost_of_goods_sold', 'equipment_costs', 'debit', true, true, 'Equipment usage costs'),
    (p_company_id, '5310', 'Equipment Rental', 'cost_of_goods_sold', 'equipment_costs', 'debit', false, true, 'Rented equipment costs'),
    (p_company_id, '5320', 'Equipment Fuel', 'cost_of_goods_sold', 'equipment_costs', 'debit', false, true, 'Fuel for equipment'),
    (p_company_id, '5330', 'Equipment Repairs', 'cost_of_goods_sold', 'equipment_costs', 'debit', false, true, 'Equipment maintenance and repairs'),
    (p_company_id, '5340', 'Small Tools', 'cost_of_goods_sold', 'equipment_costs', 'debit', false, true, 'Small tools and supplies'),

    -- Other Job Costs
    (p_company_id, '5400', 'Job Permits & Fees', 'cost_of_goods_sold', 'other_cogs', 'debit', false, true, 'Building permits and fees'),
    (p_company_id, '5410', 'Job Site Utilities', 'cost_of_goods_sold', 'other_cogs', 'debit', false, true, 'Temporary utilities on job site'),
    (p_company_id, '5420', 'Waste Disposal', 'cost_of_goods_sold', 'other_cogs', 'debit', false, true, 'Dumpsters and waste removal'),
    (p_company_id, '5430', 'Job Site Security', 'cost_of_goods_sold', 'other_cogs', 'debit', false, true, 'Security and fencing'),
    (p_company_id, '5440', 'Plans & Engineering', 'cost_of_goods_sold', 'other_cogs', 'debit', false, true, 'Architectural and engineering fees'),
    (p_company_id, '5450', 'Warranties & Corrections', 'cost_of_goods_sold', 'other_cogs', 'debit', false, true, 'Warranty work and corrections');

    -- =====================================================
    -- OPERATING EXPENSES (6000-7999)
    -- =====================================================

    INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, account_subtype, normal_balance, description) VALUES
    -- Payroll Expenses (6000-6199)
    (p_company_id, '6000', 'Office Salaries', 'expense', 'payroll_expense', 'debit', 'Office staff salaries'),
    (p_company_id, '6010', 'Management Salaries', 'expense', 'payroll_expense', 'debit', 'Management and executive salaries'),
    (p_company_id, '6020', 'Estimator Salaries', 'expense', 'payroll_expense', 'debit', 'Estimator compensation'),
    (p_company_id, '6030', 'Project Manager Salaries', 'expense', 'payroll_expense', 'debit', 'PM salaries (overhead, not job-specific)'),
    (p_company_id, '6100', 'Payroll Taxes - Office', 'expense', 'payroll_expense', 'debit', 'Employer payroll taxes for office'),
    (p_company_id, '6110', 'Employee Benefits', 'expense', 'payroll_expense', 'debit', 'Health insurance, 401k, etc.'),

    -- Overhead & Operating Expenses (6200-6999)
    (p_company_id, '6200', 'Rent - Office', 'expense', 'overhead', 'debit', 'Office and yard rent'),
    (p_company_id, '6210', 'Utilities - Office', 'expense', 'overhead', 'debit', 'Office utilities'),
    (p_company_id, '6220', 'Telephone & Internet', 'expense', 'overhead', 'debit', 'Phone and internet services'),
    (p_company_id, '6230', 'Insurance - General Liability', 'expense', 'overhead', 'debit', 'General liability insurance'),
    (p_company_id, '6240', 'Insurance - Auto', 'expense', 'overhead', 'debit', 'Vehicle insurance'),
    (p_company_id, '6250', 'Insurance - Other', 'expense', 'overhead', 'debit', 'Other business insurance'),
    (p_company_id, '6300', 'Office Supplies', 'expense', 'administrative_expense', 'debit', 'Office supplies and expenses'),
    (p_company_id, '6310', 'Postage & Shipping', 'expense', 'administrative_expense', 'debit', 'Mailing and shipping costs'),
    (p_company_id, '6320', 'Printing & Reproduction', 'expense', 'administrative_expense', 'debit', 'Printing and copying'),
    (p_company_id, '6400', 'Vehicle Fuel & Maintenance', 'expense', 'operating_expense', 'debit', 'Non-job vehicle expenses'),
    (p_company_id, '6410', 'Vehicle Lease Payments', 'expense', 'operating_expense', 'debit', 'Vehicle leases'),
    (p_company_id, '6500', 'Advertising & Marketing', 'expense', 'operating_expense', 'debit', 'Marketing and advertising'),
    (p_company_id, '6510', 'Website & Software', 'expense', 'operating_expense', 'debit', 'Software subscriptions'),
    (p_company_id, '6600', 'Legal & Professional Fees', 'expense', 'administrative_expense', 'debit', 'Legal, accounting, consulting'),
    (p_company_id, '6610', 'Licenses & Permits', 'expense', 'administrative_expense', 'debit', 'Business licenses'),
    (p_company_id, '6620', 'Dues & Subscriptions', 'expense', 'administrative_expense', 'debit', 'Professional memberships'),
    (p_company_id, '6700', 'Travel & Entertainment', 'expense', 'operating_expense', 'debit', 'Business travel'),
    (p_company_id, '6710', 'Meals & Entertainment', 'expense', 'operating_expense', 'debit', 'Business meals'),
    (p_company_id, '6800', 'Bank Fees & Charges', 'expense', 'administrative_expense', 'debit', 'Bank service charges'),
    (p_company_id, '6810', 'Credit Card Fees', 'expense', 'administrative_expense', 'debit', 'Credit card processing fees'),
    (p_company_id, '6900', 'Depreciation Expense', 'expense', 'operating_expense', 'debit', 'Depreciation on fixed assets'),
    (p_company_id, '6910', 'Bad Debt Expense', 'expense', 'operating_expense', 'debit', 'Uncollectible accounts'),
    (p_company_id, '6920', 'Miscellaneous Expense', 'expense', 'operating_expense', 'debit', 'Other business expenses');

    -- =====================================================
    -- OTHER INCOME/EXPENSE (8000-9999)
    -- =====================================================

    INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, account_subtype, normal_balance, description) VALUES
    (p_company_id, '8000', 'Interest Expense', 'other_expense', 'other_expense', 'debit', 'Interest on loans and credit'),
    (p_company_id, '8100', 'Other Expenses', 'other_expense', 'other_expense', 'debit', 'Non-operating expenses'),
    (p_company_id, '9000', 'Gain/Loss on Asset Sale', 'other_income', 'other_income', 'credit', 'Gains or losses from asset sales');

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER TO AUTO-CREATE COA FOR NEW COMPANIES
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_coa_for_company()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default COA when a new company is created
    PERFORM create_default_chart_of_accounts(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_auto_create_coa'
    ) THEN
        CREATE TRIGGER trg_auto_create_coa
            AFTER INSERT ON companies
            FOR EACH ROW
            EXECUTE FUNCTION auto_create_coa_for_company();
    END IF;
END $$;

-- =====================================================
-- CREATE COA FOR EXISTING COMPANIES
-- =====================================================

-- Create default COA for all existing companies that don't have one
DO $$
DECLARE
    v_company RECORD;
BEGIN
    FOR v_company IN
        SELECT id FROM companies
        WHERE NOT EXISTS (
            SELECT 1 FROM chart_of_accounts WHERE company_id = companies.id
        )
    LOOP
        PERFORM create_default_chart_of_accounts(v_company.id);
    END LOOP;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION create_default_chart_of_accounts IS 'Creates a complete default chart of accounts for construction companies following industry best practices';
