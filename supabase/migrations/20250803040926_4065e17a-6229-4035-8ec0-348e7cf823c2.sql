-- Create labor_burden_rates table
CREATE TABLE public.labor_burden_rates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    base_hourly_rate DECIMAL(10,2) NOT NULL,
    burden_rate_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_hourly_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    federal_tax_rate DECIMAL(5,2) DEFAULT 7.65,
    state_tax_rate DECIMAL(5,2) DEFAULT 5.00,
    fica_rate DECIMAL(5,2) DEFAULT 7.65,
    unemployment_rate DECIMAL(5,2) DEFAULT 3.00,
    workers_comp_rate DECIMAL(5,2) DEFAULT 2.50,
    general_liability_rate DECIMAL(5,2) DEFAULT 1.00,
    health_insurance_monthly DECIMAL(10,2) DEFAULT 500.00,
    retirement_contribution_rate DECIMAL(5,2) DEFAULT 3.00,
    equipment_allowance_monthly DECIMAL(10,2) DEFAULT 100.00,
    vehicle_allowance_monthly DECIMAL(10,2) DEFAULT 0.00,
    other_benefits_monthly DECIMAL(10,2) DEFAULT 0.00,
    annual_hours INTEGER DEFAULT 2080,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.labor_burden_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "labor_burden_rates_company_isolation" ON public.labor_burden_rates
    FOR ALL USING (company_id = get_user_company(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_labor_burden_rates_company_id ON public.labor_burden_rates(company_id);
CREATE INDEX idx_labor_burden_rates_job_title ON public.labor_burden_rates(job_title);
CREATE INDEX idx_labor_burden_rates_employee_id ON public.labor_burden_rates(employee_id);
CREATE INDEX idx_labor_burden_rates_effective_date ON public.labor_burden_rates(effective_date);

-- Create trigger for updated_at
CREATE TRIGGER update_labor_burden_rates_updated_at
    BEFORE UPDATE ON public.labor_burden_rates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();