-- Add approval assignment fields to change_orders table
ALTER TABLE public.change_orders 
ADD COLUMN assigned_approvers uuid[] DEFAULT '{}',
ADD COLUMN approval_due_date date,
ADD COLUMN approval_notes text;