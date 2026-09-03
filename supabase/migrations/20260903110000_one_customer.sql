-- The same customer is four unlinked rows (US-326).
--
-- There is no clients table and no projects.client_id. A homeowner who is a
-- lead, gets an estimate, becomes a project and logs into the portal exists as
-- four rows with no key between them:
--
--   contacts                  first_name, last_name, email  (the CRM record)
--   estimates                 client_name, client_email, client_phone as free
--                             text, with no contact picker on the form
--   projects                  client_name, client_email, where CreateProject
--                             builds its autocomplete by selecting those two
--                             strings from past projects and de-duplicating
--   client_portal_access      client_email again, keyed to a project
--
-- So a corrected phone number has to be fixed four times, nobody can answer
-- "what have we done for this customer", and the same person spelled two ways
-- is two customers. CreateProject's autocomplete makes this worse rather than
-- better: it offers strings, so choosing one copies text rather than linking a
-- record.
--
-- contacts is designated the customer entity. It already has everything a
-- customer needs (name, email, phone, mobile, address, company_name,
-- contact_type) and it is where the CRM already works. A separate clients
-- table would be a fifth place a customer lives.
--
-- Additive and nullable, with the existing text columns left in place and
-- dual-written for a release, per the deprecation flow in CLAUDE.md: iOS at
-- MIN_SUPPORTED_IOS_VERSION reads projects.client_name and would show blank
-- customers the day it was dropped.

ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE public.client_portal_access
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.projects.client_id IS
  'The customer, as a contacts row. client_name and client_email remain and are dual-written for one release (US-326).';

-- ---------------------------------------------------------------------------
-- Backfill: link what can be linked, create a contact for what cannot
-- ---------------------------------------------------------------------------
-- Matched on lowercased email within the same company. Email is the only field
-- these four tables share that identifies a person; matching on name would
-- merge two different Dana Whitfields at the same builder, which is worse than
-- leaving a row unlinked.
DO $$
DECLARE
  v_linked   integer := 0;
  v_created  integer := 0;
  v_unmatched integer := 0;
  v_n        integer;
BEGIN
  -- 1. Link by email where a contact already exists.
  UPDATE public.estimates e
     SET client_id = c.id
    FROM public.contacts c
   WHERE e.client_id IS NULL
     AND c.company_id = e.company_id
     AND e.client_email IS NOT NULL
     AND lower(btrim(c.email)) = lower(btrim(e.client_email));
  GET DIAGNOSTICS v_n = ROW_COUNT; v_linked := v_linked + v_n;

  UPDATE public.projects p
     SET client_id = c.id
    FROM public.contacts c
   WHERE p.client_id IS NULL
     AND c.company_id = p.company_id
     AND p.client_email IS NOT NULL
     AND lower(btrim(c.email)) = lower(btrim(p.client_email));
  GET DIAGNOSTICS v_n = ROW_COUNT; v_linked := v_linked + v_n;

  UPDATE public.invoices i
     SET client_id = c.id
    FROM public.contacts c
   WHERE i.client_id IS NULL
     AND c.company_id = i.company_id
     AND i.client_email IS NOT NULL
     AND lower(btrim(c.email)) = lower(btrim(i.client_email));
  GET DIAGNOSTICS v_n = ROW_COUNT; v_linked := v_linked + v_n;

  UPDATE public.client_portal_access a
     SET client_id = c.id
    FROM public.contacts c
   WHERE a.client_id IS NULL
     AND c.company_id = a.company_id
     AND lower(btrim(c.email)) = lower(btrim(a.client_email));
  GET DIAGNOSTICS v_n = ROW_COUNT; v_linked := v_linked + v_n;

  -- 2. Create a contact for every remaining project customer that has an
  -- email. Projects rather than estimates, because a project is a customer the
  -- contractor definitely has a relationship with; an unaccepted estimate may
  -- be a stranger, and inventing CRM records for those inflates the pipeline.
  WITH candidates AS (
    SELECT DISTINCT ON (p.company_id, lower(btrim(p.client_email)))
           p.company_id,
           btrim(p.client_email) AS email,
           btrim(COALESCE(p.client_name, '')) AS name
      FROM public.projects p
     WHERE p.client_id IS NULL
       AND p.client_email IS NOT NULL
       AND btrim(p.client_email) <> ''
     ORDER BY p.company_id, lower(btrim(p.client_email)), p.created_at
  ), inserted AS (
    INSERT INTO public.contacts (company_id, first_name, last_name, email, contact_type)
    SELECT c.company_id,
           COALESCE(NULLIF(split_part(c.name, ' ', 1), ''), c.email),
           NULLIF(btrim(substring(c.name from position(' ' in c.name))), ''),
           c.email,
           'client'
      FROM candidates c
    RETURNING id
  )
  SELECT count(*) INTO v_created FROM inserted;

  -- 3. Link the rows those new contacts were made for.
  UPDATE public.projects p
     SET client_id = c.id
    FROM public.contacts c
   WHERE p.client_id IS NULL
     AND c.company_id = p.company_id
     AND p.client_email IS NOT NULL
     AND lower(btrim(c.email)) = lower(btrim(p.client_email));
  GET DIAGNOSTICS v_n = ROW_COUNT; v_linked := v_linked + v_n;

  -- 4. What is left. A customer row with no email cannot be matched to anyone,
  -- and guessing by name would merge different people.
  SELECT count(*) INTO v_unmatched
    FROM public.projects
   WHERE client_id IS NULL
     AND (client_name IS NOT NULL AND btrim(client_name) <> '');

  RAISE NOTICE 'US-326 customer backfill: % rows linked, % contacts created, % projects still unlinked (no email to match on)',
    v_linked, v_created, v_unmatched;
END $$;

-- ---------------------------------------------------------------------------
-- Everything one customer has
-- ---------------------------------------------------------------------------
-- A view rather than four queries in the page, so "what have we done for this
-- customer" has one definition and cannot drift between screens.
CREATE OR REPLACE VIEW public.customer_activity AS
SELECT
  c.id            AS client_id,
  c.company_id,
  'estimate'      AS record_type,
  e.id            AS record_id,
  e.estimate_number AS reference,
  e.title         AS title,
  e.status        AS status,
  e.total_amount  AS amount,
  e.created_at    AS occurred_at
FROM public.contacts c
JOIN public.estimates e ON e.client_id = c.id
UNION ALL
SELECT c.id, c.company_id, 'project', p.id, NULL, p.name, p.status, p.budget, p.created_at
FROM public.contacts c
JOIN public.projects p ON p.client_id = c.id
UNION ALL
SELECT c.id, c.company_id, 'invoice', i.id, i.invoice_number, NULL, i.status, i.total_amount, i.created_at
FROM public.contacts c
JOIN public.invoices i ON i.client_id = c.id
UNION ALL
SELECT c.id, c.company_id, 'portal_access', a.id, NULL, NULL,
       CASE WHEN a.is_active THEN 'active' ELSE 'revoked' END, NULL, a.created_at
FROM public.contacts c
JOIN public.client_portal_access a ON a.client_id = c.id;

COMMENT ON VIEW public.customer_activity IS
  'Every estimate, project, invoice and portal enrolment for one contact. One definition, so the customer page and any report agree. US-326.';

GRANT SELECT ON public.customer_activity TO authenticated;
