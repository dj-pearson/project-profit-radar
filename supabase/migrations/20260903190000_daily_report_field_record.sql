-- The daily report as the field record (US-330).
--
-- WHAT WAS THERE.
--
-- Crew was an integer. daily_reports.crew_count, typed by hand, while the same
-- people had already clocked in against the same project on the same day in
-- time_entries. So the superintendent entered the crew twice, and the two
-- numbers disagreed with nobody able to say which was right.
--
-- daily_report_crew_items, daily_report_task_items, daily_report_material_items
-- and daily_report_equipment_items were created in 20251110000003 and are
-- queried by no file in src/. Four correctly-shaped tables, never written.
--
-- Photos lived in daily_reports.photos, a text[] of storage paths. A previous
-- story fixed the worst of it - they do upload, and the column holds paths
-- rather than permanent public URLs - but they exist only as strings on one
-- row. Nothing can find a photo by project, by date or by who took it; there
-- is no caption, no GPS, no taken_at, and no way for a timeline (US-107) or a
-- classifier (US-046) to read them.
--
-- Meanwhile photo_attachments has held exactly the right shape since
-- 20250804010545 - project, daily report, time entry, file_path, file_size,
-- mime_type, caption, gps_coordinates, taken_at - and has never been written
-- to either.
--
-- WHAT THIS DOES.
--
-- photo_attachments is the photo record. Not project_photos, which US-330's
-- own acceptance criteria name: that table is (url, description, user_id) with
-- no daily report, no GPS and no taken_at, and its `url` column is a permanent
-- public URL, which is the pattern US-289 exists to remove. Building the
-- timeline on a table that stores public URLs would have to be undone the day
-- the bucket goes private. Recorded as a deviation on the story.
--
-- Crew is pulled from the time entries that already exist, and stays editable.
-- The integer column is kept and dual-written, because iOS at
-- MIN_SUPPORTED_IOS_VERSION reads crew_count.
--
-- Additive throughout: new columns, new policies (permissive policies OR
-- together, so an added one only ever grants), no drops, no tightening.

-- ---------------------------------------------------------------------------
-- 1. The photo record
-- ---------------------------------------------------------------------------
ALTER TABLE public.photo_attachments
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Which bucket the path is in. project-documents today; US-289 makes it
  -- private, and a later move to another bucket is then mechanical rather than
  -- a guess about where each historical file lives.
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT NOT NULL DEFAULT 'project-documents',
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'daily_report'
    CHECK (source IN ('daily_report', 'punch_list', 'progress', 'safety', 'other')),
  -- US-046. Written by the classifier, never by a person, so a NULL here means
  -- "not classified yet" rather than "nothing in the picture".
  ADD COLUMN IF NOT EXISTS ai_tags TEXT[],
  ADD COLUMN IF NOT EXISTS ai_classified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(4,3);

COMMENT ON TABLE public.photo_attachments IS
  'The one photo record: project, daily report, who took it, when, where, caption and AI tags. Created 20250804010545 and unwritten until US-330.';
COMMENT ON COLUMN public.photo_attachments.ai_tags IS
  'Written by the classify-photo function (US-046). NULL means not yet classified, not "nothing found".';

UPDATE public.photo_attachments pa
   SET company_id = p.company_id
  FROM public.projects p
 WHERE pa.project_id = p.id
   AND pa.company_id IS NULL;

-- The existing policies from 20250804010545 scope by project_assignments, so
-- a PM who is not assigned to a job cannot see its photos and the office never
-- can. That is too narrow for a document the customer is sent. These are
-- additive: a permissive policy only ever grants.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'photo_attachments' AND policyname = 'Staff read their company photos'
  ) THEN
    CREATE POLICY "Staff read their company photos"
      ON public.photo_attachments FOR SELECT
      TO authenticated
      USING (company_id = public.get_user_company(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'photo_attachments' AND policyname = 'Staff add photos to their company projects'
  ) THEN
    CREATE POLICY "Staff add photos to their company projects"
      ON public.photo_attachments FOR INSERT
      TO authenticated
      WITH CHECK (company_id = public.get_user_company(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'photo_attachments' AND policyname = 'Staff caption their company photos'
  ) THEN
    -- Editing a caption, not replacing the file: file_path is not something
    -- this grants a way to repoint, because the storage object it names is
    -- governed by the bucket policy separately.
    CREATE POLICY "Staff caption their company photos"
      ON public.photo_attachments FOR UPDATE
      TO authenticated
      USING (company_id = public.get_user_company(auth.uid()))
      WITH CHECK (company_id = public.get_user_company(auth.uid()));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Nothing already uploaded is stranded
-- ---------------------------------------------------------------------------
-- Every path in daily_reports.photos becomes a row. Idempotent on file_path,
-- so re-running cannot double a photo. taken_at falls back to the report's
-- date, which is the day the work happened - closer to the truth than now().
INSERT INTO public.photo_attachments
  (project_id, daily_report_id, company_id, user_id, file_name, file_path,
   storage_bucket, source, taken_at, created_at)
SELECT dr.project_id,
       dr.id,
       -- daily_reports.company_id is nullable and some rows predate it. The
       -- project always has one, and a NULL here would leave the photo
       -- invisible to the company-scoped policy below.
       COALESCE(dr.company_id, p.company_id),
       COALESCE(dr.created_by, dr.submitted_by),
       regexp_replace(path, '^.*/', ''),
       path,
       'project-documents',
       'daily_report',
       dr.date::timestamptz,
       dr.created_at
  FROM public.daily_reports dr
  JOIN public.projects p ON p.id = dr.project_id
  CROSS JOIN LATERAL unnest(COALESCE(dr.photos, ARRAY[]::text[])) AS path
 WHERE COALESCE(dr.created_by, dr.submitted_by) IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.photo_attachments pa
      WHERE pa.file_path = path AND pa.daily_report_id = dr.id
   );

COMMENT ON TABLE public.project_photos IS
  'DEPRECATED (US-330): superseded by photo_attachments, which records the daily report, GPS, taken_at and a storage path rather than a permanent public URL. Zero readers; scheduled for removal a release after clients stop reading it.';

-- ---------------------------------------------------------------------------
-- 3. Crew comes from the hours already clocked
-- ---------------------------------------------------------------------------
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS crew_hours NUMERIC(8,2);

COMMENT ON COLUMN public.daily_reports.crew_hours IS
  'Total crew hours on this report. crew_count stays and is dual-written for a release: iOS at MIN_SUPPORTED_IOS_VERSION reads it. US-330.';

-- Pull that day's time entries into the crew section. Editable afterwards: the
-- superintendent knows about the person who forgot to clock in, and a report
-- that cannot be corrected is one nobody trusts.
CREATE OR REPLACE FUNCTION public.sync_daily_report_crew(p_daily_report_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report  public.daily_reports;
  v_company uuid;
  v_rows    integer := 0;
BEGIN
  SELECT * INTO v_report FROM public.daily_reports WHERE id = p_daily_report_id;
  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Daily report % does not exist', p_daily_report_id;
  END IF;

  SELECT company_id INTO v_company FROM public.projects WHERE id = v_report.project_id;
  IF v_company IS DISTINCT FROM public.get_user_company(auth.uid()) THEN
    RAISE EXCEPTION 'Not your project';
  END IF;

  -- Every entry on that project and day, whatever its approval state: a report
  -- filed the same evening is written before anybody approves anything, so
  -- filtering to approved would pre-fill nothing on the day it matters.
  INSERT INTO public.daily_report_crew_items
    (daily_report_id, user_id, crew_member_name, role, hours_worked, overtime_hours)
  SELECT p_daily_report_id,
         t.user_id,
         COALESCE(NULLIF(btrim(concat_ws(' ', up.first_name, up.last_name)), ''), 'Crew member'),
         up.role::text,
         LEAST(SUM(COALESCE(t.total_hours, 0)), 8),
         GREATEST(SUM(COALESCE(t.total_hours, 0)) - 8, 0)
    FROM public.time_entries t
    LEFT JOIN public.user_profiles up ON up.id = t.user_id
   WHERE t.project_id = v_report.project_id
     AND t.start_time::date = v_report.date
   GROUP BY t.user_id, up.first_name, up.last_name, up.role
     -- Somebody already on the report was put there by hand or by an earlier
     -- run; their row wins, because it may have been corrected since.
     HAVING NOT EXISTS (
       SELECT 1 FROM public.daily_report_crew_items c
        WHERE c.daily_report_id = p_daily_report_id
          AND c.user_id = t.user_id
     );

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  -- Keep the legacy integer and the new total in step with what is now listed.
  UPDATE public.daily_reports dr
     SET crew_count = COALESCE(counts.people, dr.crew_count),
         crew_hours = counts.hours
    FROM (
      SELECT count(*)::int AS people,
             SUM(COALESCE(hours_worked, 0) + COALESCE(overtime_hours, 0)) AS hours
        FROM public.daily_report_crew_items
       WHERE daily_report_id = p_daily_report_id
    ) counts
   WHERE dr.id = p_daily_report_id;

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.sync_daily_report_crew(uuid) IS
  'Pre-fills a daily report crew section from that day time entries, without overwriting rows a person edited. US-330.';

REVOKE ALL ON FUNCTION public.sync_daily_report_crew(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_daily_report_crew(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Does the report agree with the timesheets?
-- ---------------------------------------------------------------------------
-- The whole point of pulling crew from time entries is that the two numbers
-- reconcile. This makes the disagreement visible instead of leaving it for
-- payroll to find.
CREATE OR REPLACE VIEW public.daily_report_reconciliation AS
SELECT
  dr.id                                   AS daily_report_id,
  dr.project_id,
  dr.company_id,
  dr.date,
  dr.crew_count                           AS reported_crew,
  COALESCE(dr.crew_hours, 0)              AS reported_hours,
  COALESCE(ts.workers, 0)                 AS timesheet_crew,
  COALESCE(ts.hours, 0)                   AS timesheet_hours,
  COALESCE(dr.crew_hours, 0) - COALESCE(ts.hours, 0) AS hours_variance,
  COALESCE(ph.photos, 0)                  AS photo_count
FROM public.daily_reports dr
LEFT JOIN LATERAL (
  SELECT count(DISTINCT t.user_id)::int AS workers,
         SUM(COALESCE(t.total_hours, 0)) AS hours
    FROM public.time_entries t
   WHERE t.project_id = dr.project_id
     AND t.start_time::date = dr.date
) ts ON true
LEFT JOIN LATERAL (
  SELECT count(*)::int AS photos
    FROM public.photo_attachments pa
   WHERE pa.daily_report_id = dr.id
) ph ON true;

COMMENT ON VIEW public.daily_report_reconciliation IS
  'A daily report next to the timesheets for the same project and day. Where the two disagree, and how many photos back it up. US-330.';

GRANT SELECT ON public.daily_report_reconciliation TO authenticated;
