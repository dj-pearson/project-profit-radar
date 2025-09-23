-- Add missing fields to existing invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'standard' CHECK (invoice_type IN ('standard', 'progress', 'retention', 'final')),
ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS previous_amount_billed DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_amount_due DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS retention_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS retention_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS retention_due_date DATE,
ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS client_address TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS po_number TEXT,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE;

-- Update line items table to match expected schema
ALTER TABLE public.invoice_line_items 
ADD COLUMN IF NOT EXISTS line_total DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS work_completed_percentage DECIMAL(5,2);

-- Update line_total to match total_price if it exists
UPDATE public.invoice_line_items 
SET line_total = total_price 
WHERE line_total IS NULL AND total_price IS NOT NULL;

-- Add missing fields to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS total_budget DECIMAL(15,2) DEFAULT 0;