-- =====================================================
-- ENTERPRISE FINANCE MODULE - COMPLETE ACCOUNTING SYSTEM
-- =====================================================
-- This migration creates a full double-entry accounting system
-- integrated with BuildDesk's construction management features
-- =====================================================

-- =====================================================
-- FISCAL YEARS AND PERIODS
-- =====================================================

-- Fiscal years for period management
CREATE TABLE IF NOT EXISTS fiscal_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    year_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, year_number),
    CHECK (end_date > start_date)
);

-- Fiscal periods (months or custom periods)
CREATE TABLE IF NOT EXISTS fiscal_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period_number INTEGER NOT NULL,
    period_name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(fiscal_year_id, period_number),
    CHECK (end_date > start_date)
);

-- =====================================================
-- CHART OF ACCOUNTS (COA)
-- =====================================================

-- Account types for construction industry
CREATE TYPE account_type AS ENUM (
    'asset',
    'liability',
    'equity',
    'revenue',
    'cost_of_goods_sold',
    'expense',
    'other_income',
    'other_expense'
);

-- Account subtypes for detailed classification
CREATE TYPE account_subtype AS ENUM (
    -- Assets
    'cash',
    'bank',
    'accounts_receivable',
    'other_current_asset',
    'fixed_asset',
    'accumulated_depreciation',
    'other_asset',

    -- Liabilities
    'accounts_payable',
    'credit_card',
    'other_current_liability',
    'long_term_liability',

    -- Equity
    'equity',
    'retained_earnings',
    'owners_draw',

    -- Revenue
    'service_revenue',
    'sales_revenue',
    'other_revenue',

    -- COGS
    'direct_labor',
    'direct_materials',
    'subcontractors',
    'equipment_costs',
    'other_cogs',

    -- Expenses
    'operating_expense',
    'administrative_expense',
    'payroll_expense',
    'overhead',

    -- Other
    'other_income',
    'other_expense'
);

-- Chart of Accounts - Core accounting structure
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_number VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type account_type NOT NULL,
    account_subtype account_subtype NOT NULL,
    parent_account_id UUID REFERENCES chart_of_accounts(id),
    description TEXT,

    -- Account settings
    is_active BOOLEAN DEFAULT TRUE,
    is_system_account BOOLEAN DEFAULT FALSE,
    is_bank_account BOOLEAN DEFAULT FALSE,
    is_control_account BOOLEAN DEFAULT FALSE,
    allow_manual_entries BOOLEAN DEFAULT TRUE,

    -- Tax settings
    tax_code_id UUID,  -- Will reference tax_codes table
    is_taxable BOOLEAN DEFAULT FALSE,

    -- Job costing
    is_job_cost_account BOOLEAN DEFAULT FALSE,
    cost_code_id UUID REFERENCES cost_codes(id),

    -- Balance tracking
    normal_balance VARCHAR(6) CHECK (normal_balance IN ('debit', 'credit')),
    current_balance DECIMAL(15,2) DEFAULT 0.00,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(company_id, account_number)
);

-- Index for performance
CREATE INDEX idx_coa_company ON chart_of_accounts(company_id);
CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX idx_coa_active ON chart_of_accounts(is_active);
CREATE INDEX idx_coa_parent ON chart_of_accounts(parent_account_id);

-- =====================================================
-- TAX MANAGEMENT
-- =====================================================

-- Tax codes for sales tax, VAT, etc.
CREATE TABLE IF NOT EXISTS tax_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tax_rate DECIMAL(5,4) NOT NULL,
    is_compound BOOLEAN DEFAULT FALSE,

    -- GL accounts for tax
    tax_liability_account_id UUID REFERENCES chart_of_accounts(id),
    tax_expense_account_id UUID REFERENCES chart_of_accounts(id),

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(company_id, code)
);

-- Tax components for compound taxes
CREATE TABLE IF NOT EXISTS tax_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_tax_code_id UUID NOT NULL REFERENCES tax_codes(id) ON DELETE CASCADE,
    component_tax_code_id UUID NOT NULL REFERENCES tax_codes(id),
    sequence INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- GENERAL LEDGER
-- =====================================================

-- Transaction types
CREATE TYPE transaction_type AS ENUM (
    'journal_entry',
    'invoice',
    'bill',
    'payment',
    'credit_memo',
    'debit_memo',
    'bank_transaction',
    'payroll',
    'inventory_adjustment',
    'depreciation',
    'year_end_close',
    'adjustment'
);

-- Transaction status
CREATE TYPE transaction_status AS ENUM (
    'draft',
    'pending',
    'posted',
    'voided',
    'reversed'
);

-- Journal Entries (Header)
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Entry details
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    posting_date DATE,

    -- Classification
    transaction_type transaction_type NOT NULL DEFAULT 'journal_entry',
    transaction_status transaction_status NOT NULL DEFAULT 'draft',

    -- References
    fiscal_period_id UUID REFERENCES fiscal_periods(id),
    reference_number VARCHAR(100),
    reference_type VARCHAR(50), -- 'invoice', 'bill', 'payment', etc.
    reference_id UUID, -- ID of the source document

    -- Description
    memo TEXT,
    description TEXT,

    -- Project allocation
    project_id UUID REFERENCES projects(id),

    -- Financial controls
    is_recurring BOOLEAN DEFAULT FALSE,
    is_reversing BOOLEAN DEFAULT FALSE,
    reversal_date DATE,
    reversed_entry_id UUID REFERENCES journal_entries(id),

    -- Approval workflow
    requires_approval BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    posted_by UUID REFERENCES auth.users(id),

    UNIQUE(company_id, entry_number)
);

-- Journal Entry Lines (Details) - Double-entry bookkeeping
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Line details
    line_number INTEGER NOT NULL,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),

    -- Amounts (one must be > 0, other must be 0)
    debit_amount DECIMAL(15,2) DEFAULT 0.00 CHECK (debit_amount >= 0),
    credit_amount DECIMAL(15,2) DEFAULT 0.00 CHECK (credit_amount >= 0),

    -- Dimensions for reporting
    project_id UUID REFERENCES projects(id),
    cost_code_id UUID REFERENCES cost_codes(id),
    vendor_id UUID REFERENCES vendors(id),
    customer_id UUID,
    employee_id UUID,

    -- Tax information
    tax_code_id UUID REFERENCES tax_codes(id),
    tax_amount DECIMAL(15,2) DEFAULT 0.00,

    -- Description
    description TEXT,
    memo TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),

    CHECK (debit_amount > 0 OR credit_amount > 0),
    CHECK (NOT (debit_amount > 0 AND credit_amount > 0))
);

-- Indexes for performance
CREATE INDEX idx_je_company ON journal_entries(company_id);
CREATE INDEX idx_je_date ON journal_entries(entry_date);
CREATE INDEX idx_je_status ON journal_entries(transaction_status);
CREATE INDEX idx_je_period ON journal_entries(fiscal_period_id);
CREATE INDEX idx_je_project ON journal_entries(project_id);

CREATE INDEX idx_jel_journal ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines(account_id);
CREATE INDEX idx_jel_project ON journal_entry_lines(project_id);

-- =====================================================
-- ACCOUNTS PAYABLE (AP) - ENHANCED
-- =====================================================

-- Bills (Vendor Invoices)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Bill details
    bill_number VARCHAR(100) NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    vendor_ref_number VARCHAR(100),

    -- Dates
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,

    -- Amounts
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL,
    amount_paid DECIMAL(15,2) DEFAULT 0.00,
    amount_due DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

    -- Status
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('draft', 'open', 'partial', 'paid', 'void', 'overdue')),

    -- Project allocation
    project_id UUID REFERENCES projects(id),

    -- GL integration
    ap_account_id UUID REFERENCES chart_of_accounts(id),
    journal_entry_id UUID REFERENCES journal_entries(id),

    -- Payment terms
    payment_terms VARCHAR(50),
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    discount_date DATE,

    -- Metadata
    memo TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(company_id, bill_number)
);

-- Bill line items
CREATE TABLE IF NOT EXISTS bill_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,

    -- Amounts
    quantity DECIMAL(15,4) DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,

    -- GL and project allocation
    expense_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    project_id UUID REFERENCES projects(id),
    cost_code_id UUID REFERENCES cost_codes(id),

    -- Tax
    tax_code_id UUID REFERENCES tax_codes(id),
    tax_amount DECIMAL(15,2) DEFAULT 0.00,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bill payments
CREATE TABLE IF NOT EXISTS bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    payment_number VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL,

    -- Vendor and amount
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    total_amount DECIMAL(15,2) NOT NULL,

    -- Payment method
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('check', 'ach', 'wire', 'credit_card', 'cash', 'other')),
    check_number VARCHAR(50),
    reference_number VARCHAR(100),

    -- Bank account
    bank_account_id UUID REFERENCES chart_of_accounts(id),

    -- GL integration
    journal_entry_id UUID REFERENCES journal_entries(id),

    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(company_id, payment_number)
);

-- Bill payment applications (which bills were paid)
CREATE TABLE IF NOT EXISTS bill_payment_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_payment_id UUID NOT NULL REFERENCES bill_payments(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES bills(id),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    amount_applied DECIMAL(15,2) NOT NULL,
    discount_taken DECIMAL(15,2) DEFAULT 0.00,

    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(bill_payment_id, bill_id)
);

-- =====================================================
-- ACCOUNTS RECEIVABLE (AR) - ENHANCED
-- =====================================================

-- Update invoices table to add AR enhancements
-- (invoices table already exists, we'll add columns via ALTER)

-- Customer credit memos
CREATE TABLE IF NOT EXISTS credit_memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Credit memo details
    credit_memo_number VARCHAR(100) NOT NULL,
    customer_id UUID NOT NULL,
    invoice_id UUID REFERENCES invoices(id),

    -- Dates
    credit_date DATE NOT NULL,

    -- Amounts
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL,
    amount_applied DECIMAL(15,2) DEFAULT 0.00,
    amount_available DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_applied) STORED,

    -- Status
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('draft', 'open', 'partial', 'applied', 'void')),

    -- GL integration
    ar_account_id UUID REFERENCES chart_of_accounts(id),
    journal_entry_id UUID REFERENCES journal_entries(id),

    reason TEXT,
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(company_id, credit_memo_number)
);

-- Credit memo line items
CREATE TABLE IF NOT EXISTS credit_memo_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_memo_id UUID NOT NULL REFERENCES credit_memos(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,

    quantity DECIMAL(15,4) DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,

    revenue_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    project_id UUID REFERENCES projects(id),

    tax_code_id UUID REFERENCES tax_codes(id),
    tax_amount DECIMAL(15,2) DEFAULT 0.00,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- Credit memo applications
CREATE TABLE IF NOT EXISTS credit_memo_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_memo_id UUID NOT NULL REFERENCES credit_memos(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    amount_applied DECIMAL(15,2) NOT NULL,
    applied_date DATE NOT NULL,

    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(credit_memo_id, invoice_id)
);

-- =====================================================
-- BANK MANAGEMENT
-- =====================================================

-- Bank accounts (links to COA)
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Account details
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    bank_name VARCHAR(255) NOT NULL,
    account_number_masked VARCHAR(50),
    routing_number VARCHAR(50),
    account_type VARCHAR(20) CHECK (account_type IN ('checking', 'savings', 'credit_card', 'money_market', 'line_of_credit')),

    -- Balances
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    available_balance DECIMAL(15,2) DEFAULT 0.00,
    statement_balance DECIMAL(15,2) DEFAULT 0.00,
    statement_date DATE,

    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    currency_code VARCHAR(3) DEFAULT 'USD',

    -- Bank feed integration
    plaid_account_id VARCHAR(255),
    last_synced_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(company_id, account_id)
);

-- Bank transactions (imported or manual)
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),

    -- Transaction details
    transaction_date DATE NOT NULL,
    post_date DATE,
    description TEXT NOT NULL,

    -- Amount (positive = deposit, negative = withdrawal)
    amount DECIMAL(15,2) NOT NULL,

    -- Bank details
    check_number VARCHAR(50),
    payee VARCHAR(255),
    memo TEXT,

    -- Categorization
    category VARCHAR(100),
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciled_at TIMESTAMPTZ,

    -- Matching
    matched_journal_entry_id UUID REFERENCES journal_entries(id),
    matched_at TIMESTAMPTZ,
    matched_by UUID REFERENCES auth.users(id),

    -- Import tracking
    bank_transaction_id VARCHAR(255), -- External ID from bank
    is_pending BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bank reconciliations
CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),

    -- Reconciliation period
    statement_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Balances
    beginning_balance DECIMAL(15,2) NOT NULL,
    ending_balance DECIMAL(15,2) NOT NULL,
    statement_balance DECIMAL(15,2) NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'locked')),
    difference DECIMAL(15,2) DEFAULT 0.00,

    -- Completion
    reconciled_by UUID REFERENCES auth.users(id),
    reconciled_at TIMESTAMPTZ,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(company_id, bank_account_id, statement_date)
);

-- Reconciliation items (cleared transactions)
CREATE TABLE IF NOT EXISTS bank_reconciliation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_reconciliation_id UUID NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Link to either bank transaction or journal entry
    bank_transaction_id UUID REFERENCES bank_transactions(id),
    journal_entry_id UUID REFERENCES journal_entries(id),

    -- Clearing info
    cleared_amount DECIMAL(15,2) NOT NULL,
    is_cleared BOOLEAN DEFAULT TRUE,
    cleared_date DATE,

    created_at TIMESTAMPTZ DEFAULT now(),

    CHECK (bank_transaction_id IS NOT NULL OR journal_entry_id IS NOT NULL)
);

-- =====================================================
-- ACCOUNT BALANCES (Materialized for performance)
-- =====================================================

-- Account balances by period
CREATE TABLE IF NOT EXISTS account_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    fiscal_period_id UUID NOT NULL REFERENCES fiscal_periods(id),

    -- Balances
    beginning_balance DECIMAL(15,2) DEFAULT 0.00,
    debit_total DECIMAL(15,2) DEFAULT 0.00,
    credit_total DECIMAL(15,2) DEFAULT 0.00,
    ending_balance DECIMAL(15,2) DEFAULT 0.00,

    -- Activity
    transaction_count INTEGER DEFAULT 0,

    last_updated TIMESTAMPTZ DEFAULT now(),

    UNIQUE(company_id, account_id, fiscal_period_id)
);

CREATE INDEX idx_account_balances_company ON account_balances(company_id);
CREATE INDEX idx_account_balances_account ON account_balances(account_id);
CREATE INDEX idx_account_balances_period ON account_balances(fiscal_period_id);

-- =====================================================
-- SEQUENCES FOR AUTO-NUMBERING
-- =====================================================

-- Journal entry numbers
CREATE SEQUENCE IF NOT EXISTS journal_entry_number_seq START 1000;

-- Bill numbers
CREATE SEQUENCE IF NOT EXISTS bill_number_seq START 1000;

-- Bill payment numbers
CREATE SEQUENCE IF NOT EXISTS bill_payment_number_seq START 1000;

-- Credit memo numbers
CREATE SEQUENCE IF NOT EXISTS credit_memo_number_seq START 1000;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function: Validate journal entry balances (debits = credits)
CREATE OR REPLACE FUNCTION validate_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_debits DECIMAL(15,2);
    v_total_credits DECIMAL(15,2);
BEGIN
    -- Calculate totals for this journal entry
    SELECT
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO v_total_debits, v_total_credits
    FROM journal_entry_lines
    WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

    -- Check if balanced (allow small rounding differences)
    IF ABS(v_total_debits - v_total_credits) > 0.01 THEN
        RAISE EXCEPTION 'Journal entry is not balanced. Debits: %, Credits: %',
            v_total_debits, v_total_credits;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate balance on journal entry line changes
CREATE TRIGGER trg_validate_journal_entry_balance
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION validate_journal_entry_balance();

-- Function: Update account balances when journal entries are posted
CREATE OR REPLACE FUNCTION update_account_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process posted entries
    IF NEW.transaction_status = 'posted' AND
       (OLD.transaction_status IS NULL OR OLD.transaction_status != 'posted') THEN

        -- Update account balances for all lines in this entry
        UPDATE chart_of_accounts coa
        SET current_balance = coa.current_balance +
            CASE
                WHEN coa.normal_balance = 'debit' THEN
                    COALESCE((SELECT SUM(debit_amount - credit_amount)
                              FROM journal_entry_lines
                              WHERE journal_entry_id = NEW.id
                              AND account_id = coa.id), 0)
                ELSE
                    COALESCE((SELECT SUM(credit_amount - debit_amount)
                              FROM journal_entry_lines
                              WHERE journal_entry_id = NEW.id
                              AND account_id = coa.id), 0)
            END,
            updated_at = now()
        WHERE id IN (
            SELECT DISTINCT account_id
            FROM journal_entry_lines
            WHERE journal_entry_id = NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update balances when journal entries posted
CREATE TRIGGER trg_update_account_balances
    AFTER INSERT OR UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balances();

-- Function: Auto-update bill status based on payments
CREATE OR REPLACE FUNCTION update_bill_status()
RETURNS TRIGGER AS $$
DECLARE
    v_bill_total DECIMAL(15,2);
    v_bill_paid DECIMAL(15,2);
    v_bill_due_date DATE;
BEGIN
    -- Get bill details
    SELECT total_amount, amount_paid, due_date
    INTO v_bill_total, v_bill_paid, v_bill_due_date
    FROM bills
    WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);

    -- Update bill status
    UPDATE bills
    SET
        status = CASE
            WHEN v_bill_paid >= v_bill_total THEN 'paid'
            WHEN v_bill_paid > 0 THEN 'partial'
            WHEN CURRENT_DATE > v_bill_due_date THEN 'overdue'
            ELSE 'open'
        END,
        updated_at = now()
    WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update bill status on payment changes
CREATE TRIGGER trg_update_bill_status
    AFTER INSERT OR UPDATE OR DELETE ON bill_payment_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_status();

-- Function: Update bill totals from line items
CREATE OR REPLACE FUNCTION update_bill_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(15,2);
    v_tax_total DECIMAL(15,2);
BEGIN
    -- Calculate totals
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(tax_amount), 0)
    INTO v_subtotal, v_tax_total
    FROM bill_line_items
    WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id);

    -- Update bill
    UPDATE bills
    SET
        subtotal = v_subtotal,
        tax_amount = v_tax_total,
        total_amount = v_subtotal + v_tax_total,
        updated_at = now()
    WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update bill totals on line item changes
CREATE TRIGGER trg_update_bill_totals
    AFTER INSERT OR UPDATE OR DELETE ON bill_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_totals();

-- Function: Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER trg_fiscal_years_updated_at BEFORE UPDATE ON fiscal_years
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_fiscal_periods_updated_at BEFORE UPDATE ON fiscal_periods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_chart_of_accounts_updated_at BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_journal_entries_updated_at BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bills_updated_at BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_memo_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_memo_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (company-based multi-tenancy)
CREATE POLICY fiscal_years_company_policy ON fiscal_years
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY fiscal_periods_company_policy ON fiscal_periods
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY coa_company_policy ON chart_of_accounts
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY tax_codes_company_policy ON tax_codes
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY tax_components_company_policy ON tax_components
    FOR ALL USING (
        parent_tax_code_id IN (
            SELECT id FROM tax_codes WHERE company_id IN (
                SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY journal_entries_company_policy ON journal_entries
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY journal_entry_lines_company_policy ON journal_entry_lines
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY bills_company_policy ON bills
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY bill_line_items_company_policy ON bill_line_items
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY bill_payments_company_policy ON bill_payments
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY bill_payment_applications_company_policy ON bill_payment_applications
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY credit_memos_company_policy ON credit_memos
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY credit_memo_line_items_company_policy ON credit_memo_line_items
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY credit_memo_applications_company_policy ON credit_memo_applications
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY bank_accounts_company_policy ON bank_accounts
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY bank_transactions_company_policy ON bank_transactions
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY bank_reconciliations_company_policy ON bank_reconciliations
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY bank_reconciliation_items_company_policy ON bank_reconciliation_items
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY account_balances_company_policy ON account_balances
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE fiscal_years IS 'Fiscal year definitions for financial period management';
COMMENT ON TABLE fiscal_periods IS 'Fiscal periods (monthly, quarterly, etc.) within fiscal years';
COMMENT ON TABLE chart_of_accounts IS 'Chart of Accounts - Core accounting structure with construction-specific classifications';
COMMENT ON TABLE tax_codes IS 'Tax codes for sales tax, VAT, and other tax types';
COMMENT ON TABLE journal_entries IS 'Journal entry headers - double-entry bookkeeping transactions';
COMMENT ON TABLE journal_entry_lines IS 'Journal entry lines - debit and credit entries that must balance';
COMMENT ON TABLE bills IS 'Bills (vendor invoices) for Accounts Payable management';
COMMENT ON TABLE bill_payments IS 'Payments made to vendors for bills';
COMMENT ON TABLE credit_memos IS 'Customer credit memos for Accounts Receivable';
COMMENT ON TABLE bank_accounts IS 'Bank account registry linked to Chart of Accounts';
COMMENT ON TABLE bank_transactions IS 'Bank transactions from feeds or manual entry';
COMMENT ON TABLE bank_reconciliations IS 'Bank reconciliation sessions';
COMMENT ON TABLE account_balances IS 'Materialized account balances by period for reporting performance';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE journal_entry_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE bill_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE bill_payment_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE credit_memo_number_seq TO authenticated;
