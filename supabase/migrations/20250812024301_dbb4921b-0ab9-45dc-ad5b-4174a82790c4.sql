-- Create tables for RFI responses and Submittal reviews with secure RLS

-- rfi_responses table
CREATE TABLE IF NOT EXISTS public.rfi_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  rfi_id uuid NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,
  response_text text NOT NULL,
  responded_by uuid NOT NULL REFERENCES public.user_profiles(id),
  is_final_response boolean NOT NULL DEFAULT false,
  response_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rfi_responses ENABLE ROW LEVEL SECURITY;

-- Policies for rfi_responses
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rfi_responses' AND policyname = 'Users can view company rfi responses'
  ) THEN
    CREATE POLICY "Users can view company rfi responses"
    ON public.rfi_responses
    FOR SELECT
    USING (company_id = public.get_user_company(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rfi_responses' AND policyname = 'Users can insert company rfi responses'
  ) THEN
    CREATE POLICY "Users can insert company rfi responses"
    ON public.rfi_responses
    FOR INSERT
    WITH CHECK (company_id = public.get_user_company(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rfi_responses' AND policyname = 'Users can update own rfi responses'
  ) THEN
    CREATE POLICY "Users can update own rfi responses"
    ON public.rfi_responses
    FOR UPDATE
    USING (company_id = public.get_user_company(auth.uid()) AND responded_by = auth.uid())
    WITH CHECK (company_id = public.get_user_company(auth.uid()) AND responded_by = auth.uid());
  END IF;
END $$;

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_rfi_responses_updated_at ON public.rfi_responses;
CREATE TRIGGER trg_rfi_responses_updated_at
BEFORE UPDATE ON public.rfi_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- submittal_reviews table
CREATE TABLE IF NOT EXISTS public.submittal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  submittal_id uuid NOT NULL REFERENCES public.submittals(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.user_profiles(id),
  review_status text NOT NULL,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.submittal_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for submittal_reviews
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'submittal_reviews' AND policyname = 'Users can view company submittal reviews'
  ) THEN
    CREATE POLICY "Users can view company submittal reviews"
    ON public.submittal_reviews
    FOR SELECT
    USING (company_id = public.get_user_company(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'submittal_reviews' AND policyname = 'Users can insert company submittal reviews'
  ) THEN
    CREATE POLICY "Users can insert company submittal reviews"
    ON public.submittal_reviews
    FOR INSERT
    WITH CHECK (company_id = public.get_user_company(auth.uid()));
  END IF;
END $$;

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_submittal_reviews_updated_at ON public.submittal_reviews;
CREATE TRIGGER trg_submittal_reviews_updated_at
BEFORE UPDATE ON public.submittal_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
