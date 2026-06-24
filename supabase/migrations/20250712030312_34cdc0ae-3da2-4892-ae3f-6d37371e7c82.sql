-- Add company_id column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- Update existing tasks to have the company_id from their associated project
UPDATE public.tasks 
SET company_id = (
  SELECT p.company_id 
  FROM public.projects p 
  WHERE p.id = tasks.project_id
);

-- Make company_id not null after updating existing records
ALTER TABLE public.tasks 
ALTER COLUMN company_id SET NOT NULL;

-- Add index for performance
CREATE INDEX idx_tasks_company_id ON public.tasks(company_id);