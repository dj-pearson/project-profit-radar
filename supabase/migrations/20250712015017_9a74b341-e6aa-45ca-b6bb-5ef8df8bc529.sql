-- Add category column to punch_list_items table
ALTER TABLE public.punch_list_items 
ADD COLUMN category text DEFAULT 'quality';

-- Add check constraint for valid categories
ALTER TABLE public.punch_list_items 
ADD CONSTRAINT punch_list_items_category_check 
CHECK (category IN ('quality', 'safety', 'cleanup', 'deficiency'));