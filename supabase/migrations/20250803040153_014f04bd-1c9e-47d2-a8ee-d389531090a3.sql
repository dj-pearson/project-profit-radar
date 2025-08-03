-- Create material_suppliers table
CREATE TABLE public.material_suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    api_endpoint TEXT,
    api_key_configured BOOLEAN DEFAULT false,
    last_sync TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create material_costs table
CREATE TABLE public.material_costs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.material_suppliers(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sku TEXT,
    unit TEXT DEFAULT 'each',
    current_price DECIMAL(10,2) DEFAULT 0,
    last_price DECIMAL(10,2) DEFAULT 0,
    price_change DECIMAL(5,2) DEFAULT 0,
    price_alerts_enabled BOOLEAN DEFAULT true,
    alert_threshold DECIMAL(5,2) DEFAULT 10,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create material_price_history table for tracking price changes
CREATE TABLE public.material_price_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID NOT NULL REFERENCES public.material_costs(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    change_percentage DECIMAL(5,2),
    sync_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_price_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for material_suppliers
CREATE POLICY "material_suppliers_company_isolation" ON public.material_suppliers
    FOR ALL USING (company_id IN (
        SELECT company_id FROM public.user_profiles 
        WHERE user_id = auth.uid()
    ));

-- Create RLS policies for material_costs
CREATE POLICY "material_costs_company_isolation" ON public.material_costs
    FOR ALL USING (company_id IN (
        SELECT company_id FROM public.user_profiles 
        WHERE user_id = auth.uid()
    ));

-- Create RLS policies for material_price_history
CREATE POLICY "material_price_history_company_isolation" ON public.material_price_history
    FOR ALL USING (material_id IN (
        SELECT id FROM public.material_costs 
        WHERE company_id IN (
            SELECT company_id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    ));

-- Create indexes for better performance
CREATE INDEX idx_material_suppliers_company_id ON public.material_suppliers(company_id);
CREATE INDEX idx_material_costs_company_id ON public.material_costs(company_id);
CREATE INDEX idx_material_costs_supplier_id ON public.material_costs(supplier_id);
CREATE INDEX idx_material_price_history_material_id ON public.material_price_history(material_id);
CREATE INDEX idx_material_price_history_created_at ON public.material_price_history(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_material_suppliers_updated_at
    BEFORE UPDATE ON public.material_suppliers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_costs_updated_at
    BEFORE UPDATE ON public.material_costs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();