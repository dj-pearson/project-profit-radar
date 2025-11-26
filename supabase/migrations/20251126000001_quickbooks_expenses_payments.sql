-- Migration: Add QuickBooks Expenses and Payments tables
-- Created: 2025-11-26
-- Purpose: Complete QuickBooks 2-way sync with expenses and payments

-- ============================================================================
-- QuickBooks Expenses Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS quickbooks_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    qb_expense_id text NOT NULL,
    vendor_name text,
    amount numeric(15,2) NOT NULL DEFAULT 0,
    date date,
    payment_type text,
    account_name text,
    memo text,
    category text,
    qb_sync_token text,
    last_synced_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(qb_expense_id, company_id)
);

-- Indexes for expenses
CREATE INDEX IF NOT EXISTS idx_qb_expenses_company ON quickbooks_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_qb_expenses_date ON quickbooks_expenses(date);
CREATE INDEX IF NOT EXISTS idx_qb_expenses_vendor ON quickbooks_expenses(vendor_name);

-- RLS for expenses
ALTER TABLE quickbooks_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company expenses"
    ON quickbooks_expenses FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage company expenses"
    ON quickbooks_expenses FOR ALL
    USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
    ));

-- ============================================================================
-- QuickBooks Payments Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS quickbooks_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    qb_payment_id text NOT NULL,
    customer_name text,
    amount numeric(15,2) NOT NULL DEFAULT 0,
    date date,
    payment_method text,
    reference_number text,
    memo text,
    deposit_to_account text,
    qb_sync_token text,
    last_synced_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(qb_payment_id, company_id)
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_qb_payments_company ON quickbooks_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_qb_payments_date ON quickbooks_payments(date);
CREATE INDEX IF NOT EXISTS idx_qb_payments_customer ON quickbooks_payments(customer_name);

-- RLS for payments
ALTER TABLE quickbooks_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company payments"
    ON quickbooks_payments FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage company payments"
    ON quickbooks_payments FOR ALL
    USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
    ));

-- ============================================================================
-- Add token expiration columns to quickbooks_integrations if not exist
-- ============================================================================
DO $$
BEGIN
    -- Add access_token_expires_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quickbooks_integrations'
        AND column_name = 'access_token_expires_at'
    ) THEN
        ALTER TABLE quickbooks_integrations
        ADD COLUMN access_token_expires_at timestamptz;
    END IF;

    -- Add refresh_token_expires_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quickbooks_integrations'
        AND column_name = 'refresh_token_expires_at'
    ) THEN
        ALTER TABLE quickbooks_integrations
        ADD COLUMN refresh_token_expires_at timestamptz;
    END IF;

    -- Add qb_company_name if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quickbooks_integrations'
        AND column_name = 'qb_company_name'
    ) THEN
        ALTER TABLE quickbooks_integrations
        ADD COLUMN qb_company_name text;
    END IF;
END $$;

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_quickbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_quickbooks_expenses_updated_at ON quickbooks_expenses;
CREATE TRIGGER update_quickbooks_expenses_updated_at
    BEFORE UPDATE ON quickbooks_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_quickbooks_updated_at();

DROP TRIGGER IF EXISTS update_quickbooks_payments_updated_at ON quickbooks_payments;
CREATE TRIGGER update_quickbooks_payments_updated_at
    BEFORE UPDATE ON quickbooks_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_quickbooks_updated_at();

-- ============================================================================
-- Summary statistics view for QuickBooks sync
-- ============================================================================
CREATE OR REPLACE VIEW quickbooks_sync_summary AS
SELECT
    qi.company_id,
    qi.is_connected,
    qi.qb_company_name,
    qi.last_sync_at,
    qi.last_sync_status,
    COALESCE(qc.customer_count, 0) as customers_synced,
    COALESCE(qit.item_count, 0) as items_synced,
    COALESCE(qe.expense_count, 0) as expenses_synced,
    COALESCE(qp.payment_count, 0) as payments_synced
FROM quickbooks_integrations qi
LEFT JOIN (
    SELECT company_id, COUNT(*) as customer_count
    FROM quickbooks_customers
    GROUP BY company_id
) qc ON qc.company_id = qi.company_id
LEFT JOIN (
    SELECT company_id, COUNT(*) as item_count
    FROM quickbooks_items
    GROUP BY company_id
) qit ON qit.company_id = qi.company_id
LEFT JOIN (
    SELECT company_id, COUNT(*) as expense_count
    FROM quickbooks_expenses
    GROUP BY company_id
) qe ON qe.company_id = qi.company_id
LEFT JOIN (
    SELECT company_id, COUNT(*) as payment_count
    FROM quickbooks_payments
    GROUP BY company_id
) qp ON qp.company_id = qi.company_id;

COMMENT ON TABLE quickbooks_expenses IS 'Expenses synced from QuickBooks';
COMMENT ON TABLE quickbooks_payments IS 'Payments synced from QuickBooks';
