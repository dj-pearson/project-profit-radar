-- Update payment processor settings to include per-transaction fee
ALTER TABLE public.company_payment_settings 
ADD COLUMN per_transaction_fee NUMERIC(10,2) DEFAULT 0.50; -- $0.50 per transaction

-- Update default processing fee to 3.5% (covers 2.9% + margin)
ALTER TABLE public.company_payment_settings 
ALTER COLUMN processing_fee_percentage SET DEFAULT 3.5;