-- US-232: Bid leveling + estimate variance analysis.
--
-- Capture multiple subcontractor/supplier bids against a shared scope template
-- for a project, compare line-by-line, flag scope gaps + outliers, show variance
-- vs the estimate/budget, and record an awardee (that can seed a PO/subcontract).
--
-- Backward-compat: new tables + RLS in a single migration is the "always safe"
-- additive path (see CLAUDE.md). No existing shape is altered.

-- A bid package: the shared scope for which bids are collected on a project.
CREATE TABLE IF NOT EXISTS public.bid_packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL,
  project_id  uuid NOT NULL,
  estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
  name        text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'awarded', 'closed')),
  created_by  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- company_id must match the referenced project's company (projects has a
  -- (id, company_id) unique key); prevents cross-tenant rows.
  CONSTRAINT bid_packages_project_company_fk
    FOREIGN KEY (project_id, company_id) REFERENCES public.projects (id, company_id) ON DELETE CASCADE,
  -- Composite key so child rows can be scoped to (package, company).
  CONSTRAINT bid_packages_id_company_key UNIQUE (id, company_id)
);

-- The shared scope line items (template) every bid is compared against, with the
-- estimate/budget baseline for variance.
CREATE TABLE IF NOT EXISTS public.bid_scope_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL,
  package_id      uuid NOT NULL,
  description     text NOT NULL,
  quantity        numeric NOT NULL DEFAULT 1,
  unit            text,
  estimate_amount numeric NOT NULL DEFAULT 0,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bid_scope_items_package_company_fk
    FOREIGN KEY (package_id, company_id) REFERENCES public.bid_packages (id, company_id) ON DELETE CASCADE,
  -- Composite key so a bid line item can be bound to the same (scope, company,
  -- package) and can't mix scope from another package.
  CONSTRAINT bid_scope_items_id_company_package_key UNIQUE (id, company_id, package_id)
);

-- One bid per vendor/supplier for a package.
CREATE TABLE IF NOT EXISTS public.bids (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL,
  package_id  uuid NOT NULL,
  vendor_id   uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name text NOT NULL,
  notes       text,
  is_awarded  boolean NOT NULL DEFAULT false,
  created_by  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bids_package_company_fk
    FOREIGN KEY (package_id, company_id) REFERENCES public.bid_packages (id, company_id) ON DELETE CASCADE,
  -- Composite key so a bid line item can be bound to the same (bid, company,
  -- package).
  CONSTRAINT bids_id_company_package_key UNIQUE (id, company_id, package_id)
);

-- A vendor's quoted amount for a scope item. A null amount (or included=false)
-- means the bid did not cover that scope line (a scope gap). package_id binds the
-- bid and scope item to the same package via composite FKs.
CREATE TABLE IF NOT EXISTS public.bid_line_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL,
  package_id    uuid NOT NULL,
  bid_id        uuid NOT NULL,
  scope_item_id uuid NOT NULL,
  amount        numeric,
  included      boolean NOT NULL DEFAULT true,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bid_line_items_bid_scope_fk
    FOREIGN KEY (bid_id, company_id, package_id)
    REFERENCES public.bids (id, company_id, package_id) ON DELETE CASCADE,
  CONSTRAINT bid_line_items_scope_scope_fk
    FOREIGN KEY (scope_item_id, company_id, package_id)
    REFERENCES public.bid_scope_items (id, company_id, package_id) ON DELETE CASCADE,
  UNIQUE (bid_id, scope_item_id)
);

CREATE INDEX IF NOT EXISTS idx_bid_packages_project ON public.bid_packages (company_id, project_id);
CREATE INDEX IF NOT EXISTS idx_bid_scope_items_package ON public.bid_scope_items (company_id, package_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bids_package ON public.bids (company_id, package_id);
-- At most one awarded bid per package (defends against concurrent awards).
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_one_award_per_package
  ON public.bids (company_id, package_id) WHERE is_awarded;
CREATE INDEX IF NOT EXISTS idx_bid_line_items_bid ON public.bid_line_items (company_id, bid_id);

ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_line_items ENABLE ROW LEVEL SECURITY;

-- Company members read; builders (admin/pm) manage. Mirrors the estimates /
-- scheduling access model.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['bid_packages', 'bid_scope_items', 'bids', 'bid_line_items']
  LOOP
    EXECUTE format($f$
      CREATE POLICY "Company members can view %1$s"
        ON public.%1$s FOR SELECT TO authenticated
        USING (company_id = get_user_company(auth.uid()));
    $f$, tbl);

    EXECUTE format($f$
      CREATE POLICY "Builders can manage %1$s"
        ON public.%1$s FOR ALL TO authenticated
        USING (
          company_id = get_user_company(auth.uid())
          AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
        )
        WITH CHECK (
          company_id = get_user_company(auth.uid())
          AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
        );
    $f$, tbl);
  END LOOP;
END $$;

-- Keep updated_at fresh on writes (shared trigger function).
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['bid_packages', 'bid_scope_items', 'bids', 'bid_line_items']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_%1$s_updated_at ON public.%1$s;', tbl);
    EXECUTE format($f$
      CREATE TRIGGER set_%1$s_updated_at
        BEFORE UPDATE ON public.%1$s
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    $f$, tbl);
  END LOOP;
END $$;

-- Atomic award: clear any prior award, set the chosen bid, and flip the package
-- status in a single function (one transaction). SECURITY INVOKER so RLS still
-- applies; validates the bid belongs to the package + caller's company.
CREATE OR REPLACE FUNCTION public.award_bid(p_package_id uuid, p_bid_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_company uuid := get_user_company(auth.uid());
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.bids
    WHERE id = p_bid_id AND package_id = p_package_id AND company_id = v_company
  ) THEN
    RAISE EXCEPTION 'Bid % does not belong to package %', p_bid_id, p_package_id;
  END IF;

  UPDATE public.bids SET is_awarded = false
    WHERE package_id = p_package_id AND company_id = v_company AND id <> p_bid_id AND is_awarded;
  UPDATE public.bids SET is_awarded = true
    WHERE id = p_bid_id AND company_id = v_company;
  UPDATE public.bid_packages SET status = 'awarded'
    WHERE id = p_package_id AND company_id = v_company;
END;
$$;
