-- Create warranty management tables
CREATE TABLE public.warranties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id),
  
  -- Warranty details
  warranty_type TEXT NOT NULL CHECK (warranty_type IN ('material', 'equipment', 'labor', 'system', 'manufacturer')),
  item_name TEXT NOT NULL,
  item_description TEXT,
  manufacturer TEXT,
  model_number TEXT,
  serial_number TEXT,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  
  -- Coverage details
  warranty_duration_months INTEGER NOT NULL,
  warranty_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warranty_end_date DATE GENERATED ALWAYS AS (warranty_start_date + (warranty_duration_months || ' months')::interval) STORED,
  coverage_details TEXT,
  coverage_limitations TEXT,
  
  -- Transfer and ownership
  is_transferable BOOLEAN NOT NULL DEFAULT false,
  is_transferred_to_customer BOOLEAN NOT NULL DEFAULT false,
  transferred_at TIMESTAMP WITH TIME ZONE,
  transferred_by UUID REFERENCES public.user_profiles(id),
  
  -- Contact and documentation
  warranty_contact_name TEXT,
  warranty_contact_phone TEXT,
  warranty_contact_email TEXT,
  warranty_document_path TEXT,
  installation_date DATE,
  
  -- Status and notes
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed', 'voided', 'transferred')),
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warranty claims table
CREATE TABLE public.warranty_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warranty_id UUID NOT NULL REFERENCES public.warranties(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  
  -- Claim details
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_description TEXT NOT NULL,
  issue_category TEXT CHECK (issue_category IN ('defect', 'malfunction', 'premature_failure', 'installation_error', 'other')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Resolution
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'denied', 'in_progress', 'resolved', 'closed')),
  resolution_type TEXT CHECK (resolution_type IN ('repair', 'replace', 'refund', 'credit', 'no_action')),
  resolution_details TEXT,
  resolution_cost NUMERIC(10,2) DEFAULT 0,
  resolved_date DATE,
  resolved_by TEXT,
  
  -- Documentation
  claim_photos TEXT[], -- Array of photo URLs
  inspection_report_path TEXT,
  correspondence_log JSONB DEFAULT '[]'::jsonb,
  
  -- Customer/claimant info
  claimant_name TEXT NOT NULL,
  claimant_contact TEXT,
  claimant_email TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(warranty_id, claim_number)
);

-- Create warranty transfers table (audit trail)
CREATE TABLE public.warranty_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warranty_id UUID NOT NULL REFERENCES public.warranties(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  
  -- Transfer details
  transfer_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transferred_by UUID NOT NULL REFERENCES public.user_profiles(id),
  transfer_reason TEXT,
  customer_acknowledged BOOLEAN DEFAULT false,
  customer_acknowledged_at TIMESTAMP WITH TIME ZONE,
  
  -- Customer details at time of transfer
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  
  -- Documentation
  transfer_document_path TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for claim numbers
CREATE SEQUENCE public.warranty_claim_number_seq START 1000;

-- Function to generate claim number
CREATE OR REPLACE FUNCTION public.generate_claim_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  claim_num TEXT;
BEGIN
  SELECT nextval('public.warranty_claim_number_seq') INTO next_num;
  claim_num := 'WC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN claim_num;
END;
$$;

-- Function to set claim number
CREATE OR REPLACE FUNCTION public.set_claim_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.claim_number IS NULL OR NEW.claim_number = '' THEN
    NEW.claim_number := generate_claim_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to set claim number
CREATE TRIGGER set_claim_number_trigger
  BEFORE INSERT ON public.warranty_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.set_claim_number();

-- Function to update warranty status when transferred
CREATE OR REPLACE FUNCTION public.handle_warranty_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_transferred_to_customer = true AND OLD.is_transferred_to_customer = false THEN
    NEW.status := 'transferred';
    NEW.transferred_at := now();
    
    -- Insert transfer record
    INSERT INTO public.warranty_transfers (
      warranty_id,
      project_id,
      transferred_by,
      transfer_reason,
      customer_name,
      customer_email,
      customer_phone
    )
    SELECT 
      NEW.id,
      NEW.project_id,
      NEW.transferred_by,
      'Warranty transferred to customer',
      p.client_name,
      p.client_email,
      p.client_phone
    FROM public.projects p
    WHERE p.id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for warranty transfers
CREATE TRIGGER handle_warranty_transfer_trigger
  BEFORE UPDATE ON public.warranties
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_warranty_transfer();

-- Enable RLS
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warranties
CREATE POLICY "Users can view company warranties" 
ON public.warranties 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage company warranties" 
ON public.warranties 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for warranty claims
CREATE POLICY "Users can view company warranty claims" 
ON public.warranty_claims 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.warranties w 
    WHERE w.id = warranty_claims.warranty_id 
    AND (w.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage warranty claims" 
ON public.warranty_claims 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.warranties w 
    WHERE w.id = warranty_claims.warranty_id 
    AND w.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

-- RLS Policies for warranty transfers
CREATE POLICY "Users can view company warranty transfers" 
ON public.warranty_transfers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.warranties w 
    WHERE w.id = warranty_transfers.warranty_id 
    AND (w.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage warranty transfers" 
ON public.warranty_transfers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.warranties w 
    WHERE w.id = warranty_transfers.warranty_id 
    AND w.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_warranties_updated_at
  BEFORE UPDATE ON public.warranties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warranty_claims_updated_at
  BEFORE UPDATE ON public.warranty_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_warranties_company_project ON public.warranties(company_id, project_id);
CREATE INDEX idx_warranties_end_date ON public.warranties(warranty_end_date);
CREATE INDEX idx_warranties_status ON public.warranties(status);
CREATE INDEX idx_warranty_claims_warranty_id ON public.warranty_claims(warranty_id);
CREATE INDEX idx_warranty_claims_status ON public.warranty_claims(status);