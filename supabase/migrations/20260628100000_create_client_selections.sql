-- US-226: Client selections with automatic budget + change-order updates.
--
-- Extends the US-040 selections groundwork into a real, financially-wired
-- workflow. Builders define selection categories with an allowance and a set of
-- options (each with a price); clients pick one option per category from the
-- portal. When a builder approves an over-allowance pick, the app generates a
-- change order for the delta and bumps the project budget.
--
-- Backward-compat: three new tables + RLS in a single migration is the
-- "always safe" additive path (see CLAUDE.md). No existing shape is altered.

-- Selection categories (e.g. Flooring, Countertops) with a per-project allowance.
CREATE TABLE IF NOT EXISTS public.selection_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL,
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  allowance   numeric NOT NULL DEFAULT 0,
  created_by  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Options a client can choose within a category, each with a price.
CREATE TABLE IF NOT EXISTS public.selection_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.selection_categories(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  price       numeric NOT NULL DEFAULT 0,
  supplier    text,
  image_url   text,
  created_by  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- A client's chosen option per category, with the computed over-allowance delta
-- and a link to the generated change order once approved.
CREATE TABLE IF NOT EXISTS public.client_selections (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL,
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id      uuid NOT NULL REFERENCES public.selection_categories(id) ON DELETE CASCADE,
  option_id        uuid NOT NULL REFERENCES public.selection_options(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  delta_amount     numeric NOT NULL DEFAULT 0,
  change_order_id  uuid REFERENCES public.change_orders(id) ON DELETE SET NULL,
  notes            text,
  selected_by      uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- One active selection per category (re-picking upserts this row).
  UNIQUE (project_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_selection_categories_project
  ON public.selection_categories (company_id, project_id);
CREATE INDEX IF NOT EXISTS idx_selection_options_category
  ON public.selection_options (category_id);
CREATE INDEX IF NOT EXISTS idx_client_selections_project
  ON public.client_selections (company_id, project_id, status);

ALTER TABLE public.selection_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_selections ENABLE ROW LEVEL SECURITY;

-- Categories: everyone in the company (incl. client_portal) can read; only
-- builders (admin/pm) configure them.
CREATE POLICY "Company members can view selection categories"
  ON public.selection_categories FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Builders can manage selection categories"
  ON public.selection_categories FOR ALL TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
  );

-- Options: same access model as categories.
CREATE POLICY "Company members can view selection options"
  ON public.selection_options FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Builders can manage selection options"
  ON public.selection_options FOR ALL TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
  );

-- Client selections: any authenticated company member can read and write within
-- their company (clients pick options; builders approve/reject). Scoped by
-- company_id for site isolation; approval is enforced in the app + audit-logged.
CREATE POLICY "Company members can view client selections"
  ON public.client_selections FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company members can write client selections"
  ON public.client_selections FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company members can update client selections"
  ON public.client_selections FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()))
  WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Builders can delete client selections"
  ON public.client_selections FOR DELETE TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
  );

-- Keep updated_at fresh on writes (shared trigger function).
DROP TRIGGER IF EXISTS set_selection_categories_updated_at ON public.selection_categories;
CREATE TRIGGER set_selection_categories_updated_at
  BEFORE UPDATE ON public.selection_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_selection_options_updated_at ON public.selection_options;
CREATE TRIGGER set_selection_options_updated_at
  BEFORE UPDATE ON public.selection_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_client_selections_updated_at ON public.client_selections;
CREATE TRIGGER set_client_selections_updated_at
  BEFORE UPDATE ON public.client_selections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
