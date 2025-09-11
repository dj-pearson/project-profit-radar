-- Enable RLS on tables that have policies but RLS disabled

-- Enable RLS on automated_communications_log
ALTER TABLE public.automated_communications_log ENABLE ROW LEVEL SECURITY;

-- Enable RLS on automation_rules  
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;