-- Add due_date column to punch_list_items table
ALTER TABLE public.punch_list_items 
ADD COLUMN due_date date;