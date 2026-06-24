-- Add columns for additional payment processors to company_payment_settings table
ALTER TABLE public.company_payment_settings 
ADD COLUMN square_application_id text,
ADD COLUMN square_access_token_encrypted text,
ADD COLUMN paypal_client_id text,
ADD COLUMN paypal_client_secret_encrypted text,
ADD COLUMN authorize_net_api_login text,
ADD COLUMN authorize_net_transaction_key_encrypted text,
ADD COLUMN clover_app_id text,
ADD COLUMN clover_app_secret_encrypted text;