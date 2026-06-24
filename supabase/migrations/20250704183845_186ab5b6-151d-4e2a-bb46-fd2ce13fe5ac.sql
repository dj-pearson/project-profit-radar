-- Create promotions table for discount campaigns
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to TEXT[] DEFAULT ARRAY['starter', 'professional', 'enterprise'], -- which tiers this applies to
  display_on TEXT[] DEFAULT ARRAY['homepage', 'upgrade'], -- where to show this promotion
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date),
  CONSTRAINT valid_discount CHECK (discount_percentage > 0 AND discount_percentage <= 100)
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Root admins can manage promotions" 
ON public.promotions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

-- Create policy for viewing active promotions (needed for pricing display)
CREATE POLICY "Anyone can view active promotions" 
ON public.promotions 
FOR SELECT 
USING (is_active = true AND start_date <= now() AND end_date >= now());

-- Create function to get active promotions
CREATE OR REPLACE FUNCTION public.get_active_promotions(p_display_location TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  discount_percentage DECIMAL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  applies_to TEXT[],
  display_on TEXT[]
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    p.id,
    p.name,
    p.description,
    p.discount_percentage,
    p.start_date,
    p.end_date,
    p.applies_to,
    p.display_on
  FROM public.promotions p
  WHERE p.is_active = true 
    AND p.start_date <= now() 
    AND p.end_date >= now()
    AND (p_display_location IS NULL OR p_display_location = ANY(p.display_on));
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();