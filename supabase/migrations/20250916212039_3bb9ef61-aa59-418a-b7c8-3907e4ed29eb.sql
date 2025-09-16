-- Create project_expenses table for expense tracking
CREATE TABLE public.project_expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create GPS locations table for crew tracking
CREATE TABLE public.gps_locations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy DECIMAL(8,2) NOT NULL DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    activity_type TEXT NOT NULL DEFAULT 'location_update' CHECK (activity_type IN ('clock_in', 'clock_out', 'break', 'location_update')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_settings table for various configuration options
CREATE TABLE public.company_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
    gps_settings JSONB DEFAULT '{"tracking_enabled": false, "update_interval": 300, "geofence_radius": 100, "accuracy_threshold": 50}',
    notification_settings JSONB DEFAULT '{}',
    integration_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_expenses
CREATE POLICY "Users can view expenses for their company projects" 
ON public.project_expenses FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.projects p 
        JOIN public.companies c ON p.company_id = c.id 
        JOIN public.profiles prof ON prof.company_id = c.id 
        WHERE p.id = project_expenses.project_id 
        AND prof.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create expenses for their company projects" 
ON public.project_expenses FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p 
        JOIN public.companies c ON p.company_id = c.id 
        JOIN public.profiles prof ON prof.company_id = c.id 
        WHERE p.id = project_expenses.project_id 
        AND prof.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update expenses for their company projects" 
ON public.project_expenses FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.projects p 
        JOIN public.companies c ON p.company_id = c.id 
        JOIN public.profiles prof ON prof.company_id = c.id 
        WHERE p.id = project_expenses.project_id 
        AND prof.user_id = auth.uid()
    )
);

-- Create RLS policies for gps_locations
CREATE POLICY "Users can view GPS locations for their company" 
ON public.gps_locations FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles prof 
        WHERE prof.company_id = gps_locations.company_id 
        AND prof.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create their own GPS locations" 
ON public.gps_locations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for company_settings
CREATE POLICY "Users can view their company settings" 
ON public.company_settings FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles prof 
        WHERE prof.company_id = company_settings.company_id 
        AND prof.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their company settings" 
ON public.company_settings FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles prof 
        WHERE prof.company_id = company_settings.company_id 
        AND prof.user_id = auth.uid()
        AND prof.role IN ('admin', 'owner')
    )
);

CREATE POLICY "Users can modify their company settings" 
ON public.company_settings FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles prof 
        WHERE prof.company_id = company_settings.company_id 
        AND prof.user_id = auth.uid()
        AND prof.role IN ('admin', 'owner')
    )
);

-- Create indexes for better performance
CREATE INDEX idx_project_expenses_project_id ON public.project_expenses(project_id);
CREATE INDEX idx_project_expenses_company_id ON public.project_expenses(company_id);
CREATE INDEX idx_project_expenses_date ON public.project_expenses(date);
CREATE INDEX idx_project_expenses_status ON public.project_expenses(status);

CREATE INDEX idx_gps_locations_user_id ON public.gps_locations(user_id);
CREATE INDEX idx_gps_locations_company_id ON public.gps_locations(company_id);
CREATE INDEX idx_gps_locations_project_id ON public.gps_locations(project_id);
CREATE INDEX idx_gps_locations_timestamp ON public.gps_locations(timestamp DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_project_expenses_updated_at
    BEFORE UPDATE ON public.project_expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();