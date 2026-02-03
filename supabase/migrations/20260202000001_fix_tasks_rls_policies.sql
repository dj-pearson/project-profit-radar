-- =====================================================
-- FIX TASKS RLS POLICIES
-- =====================================================
-- Migration: 20260202000001
-- Purpose: Fix RLS policies for tasks table to work without requiring site_id in JWT
-- Date: 2026-02-02
-- Issue: Tasks query returns 403 because site_id policy fails when site_id not in JWT
-- =====================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "site_tasks_all" ON public.tasks;
DROP POLICY IF EXISTS "Users can view company tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks they created or are assigned to" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks they created" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project managers can manage tasks" ON public.tasks;

-- Create robust RLS policies that work with company_id-based access
-- These policies use direct company_id lookup from user_profiles

-- SELECT: Users can view tasks from their company
CREATE POLICY "tasks_select_company"
ON public.tasks FOR SELECT
USING (
  company_id IN (
    SELECT up.company_id
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
  )
);

-- INSERT: Users can create tasks in their company
CREATE POLICY "tasks_insert_company"
ON public.tasks FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT up.company_id
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- UPDATE: Users can update tasks they created, are assigned to, or if they are admin/pm
CREATE POLICY "tasks_update_company"
ON public.tasks FOR UPDATE
USING (
  company_id IN (
    SELECT up.company_id
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
  )
  AND (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'project_manager', 'root_admin')
    )
  )
);

-- DELETE: Users can delete tasks they created or if they are admin
CREATE POLICY "tasks_delete_company"
ON public.tasks FOR DELETE
USING (
  company_id IN (
    SELECT up.company_id
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
  )
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'root_admin')
    )
  )
);

-- =====================================================
-- FIX TASK_COMMENTS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view comments on company tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can create comments on company tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.task_comments;

-- SELECT: Users can view comments on tasks from their company
CREATE POLICY "task_comments_select_company"
ON public.task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.user_profiles up ON up.company_id = t.company_id
    WHERE t.id = task_comments.task_id
    AND up.id = auth.uid()
  )
);

-- INSERT: Users can create comments on tasks from their company
CREATE POLICY "task_comments_insert_company"
ON public.task_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.user_profiles up ON up.company_id = t.company_id
    WHERE t.id = task_comments.task_id
    AND up.id = auth.uid()
  )
);

-- UPDATE: Users can update their own comments
CREATE POLICY "task_comments_update_own"
ON public.task_comments FOR UPDATE
USING (user_id = auth.uid());

-- DELETE: Users can delete their own comments
CREATE POLICY "task_comments_delete_own"
ON public.task_comments FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'tasks';

  RAISE NOTICE 'Tasks table now has % RLS policies', v_policy_count;

  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'task_comments';

  RAISE NOTICE 'Task_comments table now has % RLS policies', v_policy_count;
END $$;
