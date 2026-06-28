import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { cascadeReschedule, type DatedTask } from '@/lib/schedule/criticalPath';
import {
  parseDate,
  taskEndDate,
  snapshotTasks,
  type ScheduleTaskRow,
  type ScheduleDependencyRow,
  type BaselineTaskSnapshot,
} from '@/lib/schedule/scheduleBoard';

/**
 * US-223: persistence for the DB-backed project schedule (tasks, finish-to-start
 * dependencies, baselines). All reads/writes are company_id-scoped for site
 * isolation (in addition to RLS). The critical-path math lives in
 * src/lib/schedule (pure + tested); this module only does I/O.
 */

export interface ScheduleBaseline {
  id: string;
  name: string;
  is_current: boolean;
  tasks: BaselineTaskSnapshot[];
  created_at: string;
}

export async function fetchScheduleTasks(projectId: string, companyId: string): Promise<ScheduleTaskRow[]> {
  const { data, error } = await supabase
    .from('schedule_tasks')
    .select('*')
    .eq('company_id', companyId)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('start_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ScheduleTaskRow[];
}

export async function fetchDependencies(projectId: string, companyId: string): Promise<ScheduleDependencyRow[]> {
  const { data, error } = await supabase
    .from('schedule_task_dependencies')
    .select('id, predecessor_id, successor_id, lag_days')
    .eq('company_id', companyId)
    .eq('project_id', projectId);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ScheduleDependencyRow[];
}

export async function createScheduleTask(params: {
  companyId: string;
  projectId: string;
  name: string;
  startDate: string;
  durationDays: number;
  sortOrder?: number;
}): Promise<void> {
  const { error } = await supabase.from('schedule_tasks').insert([
    {
      company_id: params.companyId,
      project_id: params.projectId,
      name: params.name,
      start_date: params.startDate,
      duration_days: params.durationDays,
      sort_order: params.sortOrder ?? 0,
    },
  ]);
  if (error) throw new Error(error.message);
}

export async function deleteScheduleTask(id: string, companyId: string): Promise<void> {
  const { error } = await supabase.from('schedule_tasks').delete().eq('id', id).eq('company_id', companyId);
  if (error) throw new Error(error.message);
}

export async function updateTaskStatus(id: string, companyId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('schedule_tasks')
    .update({ status })
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw new Error(error.message);
}

export async function addDependency(params: {
  companyId: string;
  projectId: string;
  predecessorId: string;
  successorId: string;
  lagDays?: number;
}): Promise<void> {
  const { error } = await supabase.from('schedule_task_dependencies').insert([
    {
      company_id: params.companyId,
      project_id: params.projectId,
      predecessor_id: params.predecessorId,
      successor_id: params.successorId,
      lag_days: params.lagDays ?? 0,
    },
  ]);
  if (error) throw new Error(error.message);
}

export async function removeDependency(id: string, companyId: string): Promise<void> {
  const { error } = await supabase
    .from('schedule_task_dependencies')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw new Error(error.message);
}

/**
 * Reschedule a task to a new start date and push its dependents per finish-to-
 * start rules (via the pure cascadeReschedule engine). Persists every task whose
 * start date changed.
 */
export async function rescheduleWithCascade(params: {
  companyId: string;
  tasks: ScheduleTaskRow[];
  deps: ScheduleDependencyRow[];
  movedId: string;
  newStartDate: string;
}): Promise<void> {
  const { companyId, tasks, deps, movedId, newStartDate } = params;
  const predecessorsByTask = new Map<string, string[]>();
  for (const dep of deps) {
    const list = predecessorsByTask.get(dep.successor_id) ?? [];
    list.push(dep.predecessor_id);
    predecessorsByTask.set(dep.successor_id, list);
  }

  const dated: DatedTask[] = tasks.map((t) => ({
    id: t.id,
    duration: t.duration_days,
    dependencies: predecessorsByTask.get(t.id) ?? [],
    startDate: parseDate(t.start_date),
    endDate: parseDate(taskEndDate(t)),
  }));

  const updated = cascadeReschedule(dated, movedId, parseDate(newStartDate));

  // Persist only tasks whose start date actually moved.
  const original = new Map(tasks.map((t) => [t.id, t.start_date]));
  const changed = updated.filter((t) => {
    const newStart = t.startDate.toISOString().slice(0, 10);
    return original.get(t.id) !== newStart;
  });

  await Promise.all(
    changed.map((t) =>
      supabase
        .from('schedule_tasks')
        .update({ start_date: t.startDate.toISOString().slice(0, 10) })
        .eq('id', t.id)
        .eq('company_id', companyId)
    )
  );
}

/** Capture the current schedule as the project's baseline (marks prior ones stale). */
export async function saveBaseline(params: {
  companyId: string;
  projectId: string;
  name: string;
  tasks: ScheduleTaskRow[];
}): Promise<void> {
  const { companyId, projectId, name, tasks } = params;
  // Demote any existing current baseline first.
  const { error: demoteError } = await supabase
    .from('schedule_baselines')
    .update({ is_current: false })
    .eq('company_id', companyId)
    .eq('project_id', projectId)
    .eq('is_current', true);
  if (demoteError) throw new Error(demoteError.message);

  const { error } = await supabase.from('schedule_baselines').insert([
    {
      company_id: companyId,
      project_id: projectId,
      name,
      is_current: true,
      tasks: snapshotTasks(tasks) as unknown as Json,
    },
  ]);
  if (error) throw new Error(error.message);
}

export async function fetchCurrentBaseline(projectId: string, companyId: string): Promise<ScheduleBaseline | null> {
  const { data, error } = await supabase
    .from('schedule_baselines')
    .select('id, name, is_current, tasks, created_at')
    .eq('company_id', companyId)
    .eq('project_id', projectId)
    .eq('is_current', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    is_current: Boolean(data.is_current),
    tasks: (Array.isArray(data.tasks) ? data.tasks : []) as unknown as BaselineTaskSnapshot[],
    created_at: data.created_at as string,
  };
}
