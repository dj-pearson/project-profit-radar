-- Create industry-specific workflow templates
CREATE TABLE public.workflow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  template_name TEXT NOT NULL,
  industry_type TEXT NOT NULL CHECK (industry_type IN ('residential', 'commercial', 'specialty_trades', 'civil', 'custom')),
  trade_specialization TEXT, -- e.g., 'electrical', 'plumbing', 'HVAC', 'roofing'
  description TEXT,
  workflow_phases JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of phase objects
  standard_tasks JSONB NOT NULL DEFAULT '[]'::jsonb, -- Common tasks for this workflow
  required_permits JSONB DEFAULT '[]'::jsonb, -- Common permits needed
  safety_protocols JSONB DEFAULT '[]'::jsonb, -- Industry-specific safety requirements
  material_categories JSONB DEFAULT '[]'::jsonb, -- Common material types
  equipment_requirements JSONB DEFAULT '[]'::jsonb, -- Typical equipment needed
  labor_roles JSONB DEFAULT '[]'::jsonb, -- Standard crew roles
  quality_checkpoints JSONB DEFAULT '[]'::jsonb, -- QC milestones
  typical_duration_days INTEGER,
  complexity_level TEXT CHECK (complexity_level IN ('basic', 'intermediate', 'advanced')),
  region_specific TEXT, -- State/region for permit requirements
  compliance_requirements JSONB DEFAULT '[]'::jsonb, -- Regulatory requirements
  cost_breakdown_template JSONB DEFAULT '{}'::jsonb, -- Typical cost distribution
  is_system_template BOOLEAN DEFAULT false, -- Built-in vs custom
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project templates table for easier project creation
CREATE TABLE public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  template_name TEXT NOT NULL,
  workflow_template_id UUID REFERENCES public.workflow_templates(id),
  project_type TEXT NOT NULL,
  default_budget_range_min NUMERIC DEFAULT 0,
  default_budget_range_max NUMERIC DEFAULT 0,
  estimated_timeline_days INTEGER,
  crew_size_recommendation INTEGER,
  template_settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_workflow_templates_industry ON public.workflow_templates(industry_type);
CREATE INDEX idx_workflow_templates_company ON public.workflow_templates(company_id);
CREATE INDEX idx_workflow_templates_trade ON public.workflow_templates(trade_specialization);
CREATE INDEX idx_project_templates_company ON public.project_templates(company_id);

-- Enable RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_templates
CREATE POLICY "Users can view system and company workflow templates" ON public.workflow_templates
  FOR SELECT USING (
    is_system_template = true OR 
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "Staff can manage company workflow templates" ON public.workflow_templates
  FOR ALL USING (
    (company_id = get_user_company(auth.uid()) AND 
     get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'root_admin']::user_role[])) OR
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "System can create system templates" ON public.workflow_templates
  FOR INSERT WITH CHECK (is_system_template = true);

-- RLS Policies for project_templates  
CREATE POLICY "Users can view company project templates" ON public.project_templates
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "Staff can manage company project templates" ON public.project_templates
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'root_admin']::user_role[])
  );

-- Add triggers for updated_at
CREATE TRIGGER update_workflow_templates_updated_at
  BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert system workflow templates
INSERT INTO public.workflow_templates (
  template_name, industry_type, trade_specialization, description, workflow_phases, 
  standard_tasks, required_permits, safety_protocols, typical_duration_days, 
  complexity_level, is_system_template
) VALUES 
-- Residential Templates
(
  'Single Family Home Construction',
  'residential',
  'general_contractor',
  'Complete workflow for single family home construction from foundation to final inspection',
  '[
    {"name": "Pre-Construction", "duration_days": 30, "description": "Permits, site prep, foundation"},
    {"name": "Foundation & Framing", "duration_days": 21, "description": "Foundation pour, framing, roof structure"},
    {"name": "MEP Rough-In", "duration_days": 14, "description": "Mechanical, electrical, plumbing rough-in"},
    {"name": "Insulation & Drywall", "duration_days": 10, "description": "Insulation install, drywall hanging and finishing"},
    {"name": "Interior Finishes", "duration_days": 21, "description": "Flooring, cabinets, trim, paint"},
    {"name": "Final Systems", "duration_days": 7, "description": "Final electrical, plumbing, HVAC connections"},
    {"name": "Final Inspection", "duration_days": 3, "description": "Final inspections and punch list"}
  ]'::jsonb,
  '[
    {"task": "Site survey and soil test", "phase": "Pre-Construction", "duration": 3},
    {"task": "Foundation excavation", "phase": "Foundation & Framing", "duration": 2},
    {"task": "Foundation pour", "phase": "Foundation & Framing", "duration": 1},
    {"task": "Framing inspection", "phase": "Foundation & Framing", "duration": 1},
    {"task": "Electrical rough-in", "phase": "MEP Rough-In", "duration": 5},
    {"task": "Plumbing rough-in", "phase": "MEP Rough-In", "duration": 4},
    {"task": "HVAC rough-in", "phase": "MEP Rough-In", "duration": 5},
    {"task": "Insulation install", "phase": "Insulation & Drywall", "duration": 2},
    {"task": "Drywall hanging", "phase": "Insulation & Drywall", "duration": 3},
    {"task": "Drywall finishing", "phase": "Insulation & Drywall", "duration": 5}
  ]'::jsonb,
  '[
    {"permit_type": "Building Permit", "authority": "Local Building Department", "typical_timeline": "2-4 weeks"},
    {"permit_type": "Electrical Permit", "authority": "Local Building Department", "typical_timeline": "1-2 weeks"},
    {"permit_type": "Plumbing Permit", "authority": "Local Building Department", "typical_timeline": "1-2 weeks"},
    {"permit_type": "Mechanical Permit", "authority": "Local Building Department", "typical_timeline": "1-2 weeks"}
  ]'::jsonb,
  '[
    {"protocol": "Fall Protection Plan", "phase": "All phases above ground level", "requirement": "OSHA 1926.501"},
    {"protocol": "Excavation Safety", "phase": "Foundation", "requirement": "OSHA 1926.651"},
    {"protocol": "Electrical Safety", "phase": "MEP Rough-In", "requirement": "OSHA 1926.416"},
    {"protocol": "Personal Protective Equipment", "phase": "All phases", "requirement": "OSHA 1926.95"}
  ]'::jsonb,
  103,
  'intermediate',
  true
),
(
  'Home Addition/Renovation',
  'residential',
  'general_contractor',
  'Workflow for residential additions and major renovations',
  '[
    {"name": "Planning & Permits", "duration_days": 21, "description": "Design finalization, permit acquisition"},
    {"name": "Demolition & Protection", "duration_days": 5, "description": "Selective demolition, existing home protection"},
    {"name": "Structural Work", "duration_days": 14, "description": "Foundation work, framing, structural modifications"},
    {"name": "MEP Integration", "duration_days": 10, "description": "Tie-ins to existing systems"},
    {"name": "Finishes", "duration_days": 18, "description": "Interior and exterior finishes"},
    {"name": "Final Integration", "duration_days": 5, "description": "System testing and final inspection"}
  ]'::jsonb,
  '[
    {"task": "Existing conditions survey", "phase": "Planning & Permits", "duration": 2},
    {"task": "Structural analysis", "phase": "Planning & Permits", "duration": 3},
    {"task": "Protective measures installation", "phase": "Demolition & Protection", "duration": 1},
    {"task": "Selective demolition", "phase": "Demolition & Protection", "duration": 4},
    {"task": "Foundation modifications", "phase": "Structural Work", "duration": 7},
    {"task": "Electrical system integration", "phase": "MEP Integration", "duration": 4}
  ]'::jsonb,
  '[
    {"permit_type": "Alteration Permit", "authority": "Local Building Department", "typical_timeline": "3-6 weeks"},
    {"permit_type": "Electrical Permit", "authority": "Local Building Department", "typical_timeline": "1-2 weeks"}
  ]'::jsonb,
  '[
    {"protocol": "Lead Paint Safety", "phase": "Demolition", "requirement": "EPA RRP Rule"},
    {"protocol": "Asbestos Assessment", "phase": "Pre-demolition", "requirement": "State regulations"},
    {"protocol": "Dust Control", "phase": "All phases", "requirement": "Local ordinances"}
  ]'::jsonb,
  73,
  'advanced',
  true
),

-- Commercial Templates
(
  'Office Tenant Improvement',
  'commercial',
  'general_contractor',
  'Complete tenant improvement workflow for office spaces',
  '[
    {"name": "Design Development", "duration_days": 14, "description": "Space planning, permit drawings"},
    {"name": "Demolition", "duration_days": 3, "description": "Remove existing improvements"},
    {"name": "MEP Rough-In", "duration_days": 7, "description": "New electrical, data, HVAC distribution"},
    {"name": "Framing & Drywall", "duration_days": 10, "description": "New partitions and finishes"},
    {"name": "Finishes & Systems", "duration_days": 14, "description": "Flooring, paint, final MEP connections"},
    {"name": "Final Inspection", "duration_days": 2, "description": "Code compliance and tenant acceptance"}
  ]'::jsonb,
  '[
    {"task": "Existing conditions documentation", "phase": "Design Development", "duration": 2},
    {"task": "Mechanical demo", "phase": "Demolition", "duration": 1},
    {"task": "Electrical demo", "phase": "Demolition", "duration": 1},
    {"task": "Data cabling installation", "phase": "MEP Rough-In", "duration": 3},
    {"task": "HVAC modifications", "phase": "MEP Rough-In", "duration": 4},
    {"task": "Metal stud framing", "phase": "Framing & Drywall", "duration": 4}
  ]'::jsonb,
  '[
    {"permit_type": "Tenant Improvement Permit", "authority": "Local Building Department", "typical_timeline": "2-3 weeks"},
    {"permit_type": "Fire Department Review", "authority": "Fire Marshal", "typical_timeline": "1-2 weeks"}
  ]'::jsonb,
  '[
    {"protocol": "Commercial Fall Protection", "phase": "All elevated work", "requirement": "OSHA 1926.501"},
    {"protocol": "Confined Space Entry", "phase": "Ceiling/mechanical work", "requirement": "OSHA 1926.1200"},
    {"protocol": "Fire Safety Plan", "phase": "All phases", "requirement": "Local fire code"}
  ]'::jsonb,
  50,
  'intermediate',
  true
),
(
  'Retail Store Build-Out',
  'commercial',
  'general_contractor',
  'New retail space construction and fit-out',
  '[
    {"name": "Shell Completion", "duration_days": 21, "description": "Base building systems and structure"},
    {"name": "MEP Infrastructure", "duration_days": 14, "description": "Power, lighting, HVAC, technology systems"},
    {"name": "Interior Construction", "duration_days": 18, "description": "Partitions, fixtures, millwork"},
    {"name": "Finishes", "duration_days": 12, "description": "Flooring, paint, signage"},
    {"name": "Systems Commissioning", "duration_days": 5, "description": "Testing and balancing all systems"},
    {"name": "Final Acceptance", "duration_days": 3, "description": "Final inspection and owner training"}
  ]'::jsonb,
  '[
    {"task": "Storefront installation", "phase": "Shell Completion", "duration": 5},
    {"task": "Electrical service upgrade", "phase": "MEP Infrastructure", "duration": 3},
    {"task": "Retail lighting installation", "phase": "MEP Infrastructure", "duration": 6},
    {"task": "Display fixture installation", "phase": "Interior Construction", "duration": 8},
    {"task": "Point-of-sale system setup", "phase": "Systems Commissioning", "duration": 2}
  ]'::jsonb,
  '[
    {"permit_type": "Commercial Building Permit", "authority": "Local Building Department", "typical_timeline": "3-4 weeks"},
    {"permit_type": "Sign Permit", "authority": "Planning Department", "typical_timeline": "2-3 weeks"},
    {"permit_type": "Fire Department Plan Review", "authority": "Fire Marshal", "typical_timeline": "2-3 weeks"}
  ]'::jsonb,
  '[
    {"protocol": "Retail Safety Plan", "phase": "All phases", "requirement": "OSHA General Industry"},
    {"protocol": "Public Safety Barriers", "phase": "Active retail areas", "requirement": "Local ordinances"},
    {"protocol": "Emergency Egress Maintenance", "phase": "All phases", "requirement": "Fire code"}
  ]'::jsonb,
  73,
  'intermediate',
  true
),

-- Specialty Trade Templates
(
  'Electrical Service Upgrade',
  'specialty_trades',
  'electrical',
  'Complete electrical service upgrade for residential or commercial properties',
  '[
    {"name": "Assessment & Planning", "duration_days": 3, "description": "Load analysis, permit applications"},
    {"name": "Utility Coordination", "duration_days": 7, "description": "Coordinate with utility company for service"},
    {"name": "Installation", "duration_days": 2, "description": "Panel installation and wiring"},
    {"name": "Testing & Inspection", "duration_days": 1, "description": "System testing and electrical inspection"},
    {"name": "Energization", "duration_days": 1, "description": "Utility connection and final testing"}
  ]'::jsonb,
  '[
    {"task": "Electrical load calculation", "phase": "Assessment & Planning", "duration": 1},
    {"task": "Permit application submission", "phase": "Assessment & Planning", "duration": 1},
    {"task": "Schedule utility disconnection", "phase": "Utility Coordination", "duration": 1},
    {"task": "Install new electrical panel", "phase": "Installation", "duration": 1},
    {"task": "Rough-in new circuits", "phase": "Installation", "duration": 1},
    {"task": "Electrical inspection", "phase": "Testing & Inspection", "duration": 1}
  ]'::jsonb,
  '[
    {"permit_type": "Electrical Permit", "authority": "Local Building Department", "typical_timeline": "1-2 weeks"},
    {"permit_type": "Utility Service Request", "authority": "Electric Utility", "typical_timeline": "2-4 weeks"}
  ]'::jsonb,
  '[
    {"protocol": "Electrical Safety Work Practices", "phase": "All phases", "requirement": "OSHA 1910.331"},
    {"protocol": "Lockout/Tagout Procedures", "phase": "Installation", "requirement": "OSHA 1910.147"},
    {"protocol": "Arc Flash Protection", "phase": "Energized work", "requirement": "NFPA 70E"}
  ]'::jsonb,
  14,
  'intermediate',
  true
),
(
  'HVAC System Installation',
  'specialty_trades',
  'hvac',
  'Complete HVAC system design and installation',
  '[
    {"name": "System Design", "duration_days": 5, "description": "Load calculations, equipment selection, ductwork design"},
    {"name": "Equipment Procurement", "duration_days": 10, "description": "Order equipment and materials"},
    {"name": "Rough-In Installation", "duration_days": 8, "description": "Ductwork, electrical rough-in, gas lines"},
    {"name": "Equipment Installation", "duration_days": 3, "description": "Install units, connect systems"},
    {"name": "Testing & Commissioning", "duration_days": 2, "description": "System testing, balancing, startup"},
    {"name": "Final Inspection", "duration_days": 1, "description": "Code inspection and owner training"}
  ]'::jsonb,
  '[
    {"task": "Manual J load calculation", "phase": "System Design", "duration": 2},
    {"task": "Ductwork layout design", "phase": "System Design", "duration": 2},
    {"task": "Install supply ductwork", "phase": "Rough-In Installation", "duration": 4},
    {"task": "Install return ductwork", "phase": "Rough-In Installation", "duration": 3},
    {"task": "Set HVAC units", "phase": "Equipment Installation", "duration": 1},
    {"task": "System commissioning", "phase": "Testing & Commissioning", "duration": 2}
  ]'::jsonb,
  '[
    {"permit_type": "Mechanical Permit", "authority": "Local Building Department", "typical_timeline": "1-2 weeks"},
    {"permit_type": "Gas Line Permit", "authority": "Local Building Department", "typical_timeline": "1 week"}
  ]'::jsonb,
  '[
    {"protocol": "Refrigerant Handling", "phase": "Equipment Installation", "requirement": "EPA Section 608"},
    {"protocol": "Gas Line Safety", "phase": "Gas connections", "requirement": "Local gas code"},
    {"protocol": "Confined Space Entry", "phase": "Ductwork installation", "requirement": "OSHA 1926.1200"}
  ]'::jsonb,
  29,
  'intermediate',
  true
),
(
  'Plumbing Rough-In to Finish',
  'specialty_trades',
  'plumbing',
  'Complete plumbing installation from rough-in through final fixtures',
  '[
    {"name": "Rough-In Planning", "duration_days": 2, "description": "Layout verification, material takeoff"},
    {"name": "Underground/Slab Work", "duration_days": 3, "description": "Under-slab plumbing and testing"},
    {"name": "Rough-In Installation", "duration_days": 5, "description": "In-wall water and waste lines"},
    {"name": "Pressure Testing", "duration_days": 1, "description": "System pressure and leak testing"},
    {"name": "Fixture Installation", "duration_days": 3, "description": "Install all plumbing fixtures"},
    {"name": "Final Testing", "duration_days": 1, "description": "Final testing and inspection"}
  ]'::jsonb,
  '[
    {"task": "Verify plumbing layout", "phase": "Rough-In Planning", "duration": 1},
    {"task": "Install under-slab lines", "phase": "Underground/Slab Work", "duration": 2},
    {"task": "Install water supply lines", "phase": "Rough-In Installation", "duration": 2},
    {"task": "Install waste and vent lines", "phase": "Rough-In Installation", "duration": 3},
    {"task": "Pressure test water lines", "phase": "Pressure Testing", "duration": 1},
    {"task": "Install toilets and sinks", "phase": "Fixture Installation", "duration": 2}
  ]'::jsonb,
  '[
    {"permit_type": "Plumbing Permit", "authority": "Local Building Department", "typical_timeline": "1-2 weeks"},
    {"permit_type": "Water Service Connection", "authority": "Water Department", "typical_timeline": "1-3 weeks"}
  ]'::jsonb,
  '[
    {"protocol": "Excavation Safety", "phase": "Underground work", "requirement": "OSHA 1926.651"},
    {"protocol": "Confined Space Entry", "phase": "Crawl space work", "requirement": "OSHA 1926.1200"},
    {"protocol": "Personal Protective Equipment", "phase": "All phases", "requirement": "OSHA 1926.95"}
  ]'::jsonb,
  15,
  'basic',
  true
);

-- Insert corresponding project templates
INSERT INTO public.project_templates (
  template_name, workflow_template_id, project_type, 
  default_budget_range_min, default_budget_range_max, 
  estimated_timeline_days, crew_size_recommendation
) VALUES 
(
  'Single Family Home - 2000-2500 sq ft',
  (SELECT id FROM public.workflow_templates WHERE template_name = 'Single Family Home Construction'),
  'New Construction',
  250000, 350000, 103, 8
),
(
  'Home Addition - 500-1000 sq ft',
  (SELECT id FROM public.workflow_templates WHERE template_name = 'Home Addition/Renovation'),
  'Addition/Renovation',
  75000, 150000, 73, 5
),
(
  'Office Space - 3000-5000 sq ft',
  (SELECT id FROM public.workflow_templates WHERE template_name = 'Office Tenant Improvement'),
  'Tenant Improvement',
  90000, 150000, 50, 6
),
(
  'Retail Store - 2000-4000 sq ft',
  (SELECT id FROM public.workflow_templates WHERE template_name = 'Retail Store Build-Out'),
  'New Construction',
  120000, 200000, 73, 7
),
(
  'Electrical Service - 200-400 Amp',
  (SELECT id FROM public.workflow_templates WHERE template_name = 'Electrical Service Upgrade'),
  'Electrical Upgrade',
  3000, 8000, 14, 2
),
(
  'HVAC Installation - Residential',
  (SELECT id FROM public.workflow_templates WHERE template_name = 'HVAC System Installation'),
  'HVAC Installation',
  8000, 15000, 29, 3
),
(
  'Plumbing - New Home',
  (SELECT id FROM public.workflow_templates WHERE template_name = 'Plumbing Rough-In to Finish'),
  'Plumbing Installation',
  8000, 15000, 15, 2
);