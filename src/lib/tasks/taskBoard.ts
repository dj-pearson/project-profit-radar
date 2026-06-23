/**
 * Task board (kanban) logic (US-102).
 *
 * Pure stage mapping/grouping — no React / Supabase — so column bucketing and
 * the status value written on drop are unit testable. Stage keys present a
 * To Do / In Progress / Review / Done board while writing back status values
 * compatible with the existing `tasks.status` taxonomy (todo / in_progress /
 * completed).
 */

export interface BoardTask {
  id: string;
  name?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  assigned_to?: string | null;
  assigned_user?: { first_name?: string | null; last_name?: string | null } | null;
}

export interface TaskStage {
  key: string;
  label: string;
  /** Value written to tasks.status when a card is dropped into this column. */
  statusValue: string;
}

export const TASK_STAGES: TaskStage[] = [
  { key: 'todo', label: 'To Do', statusValue: 'todo' },
  { key: 'in_progress', label: 'In Progress', statusValue: 'in_progress' },
  { key: 'review', label: 'Review', statusValue: 'review' },
  { key: 'done', label: 'Done', statusValue: 'completed' },
];

const STAGE_BY_KEY = new Map(TASK_STAGES.map((s) => [s.key, s]));

/** Map an arbitrary task status to a board stage key (unknown -> todo). */
export function normalizeTaskStage(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'in_progress' || s === 'in-progress' || s === 'inprogress') return 'in_progress';
  if (s === 'review' || s === 'in_review') return 'review';
  if (s === 'done' || s === 'completed' || s === 'complete') return 'done';
  return 'todo';
}

/** The tasks.status value to persist when dropping into a stage column. */
export function statusValueForStage(stageKey: string): string {
  return STAGE_BY_KEY.get(stageKey)?.statusValue ?? 'todo';
}

export interface TaskColumn extends TaskStage {
  tasks: BoardTask[];
  count: number;
}

/** Group tasks into board columns (always returns all four stages, in order). */
export function groupTasksByStage(tasks: BoardTask[]): TaskColumn[] {
  const byStage = new Map<string, BoardTask[]>();
  for (const stage of TASK_STAGES) byStage.set(stage.key, []);
  for (const task of tasks) {
    byStage.get(normalizeTaskStage(task.status))!.push(task);
  }
  return TASK_STAGES.map((stage) => {
    const stageTasks = byStage.get(stage.key)!;
    return { ...stage, tasks: stageTasks, count: stageTasks.length };
  });
}

/** Up-to-two-letter initials for an assignee avatar. */
export function assigneeInitials(user: BoardTask['assigned_user']): string {
  if (!user) return '';
  const f = (user.first_name ?? '').trim();
  const l = (user.last_name ?? '').trim();
  const initials = `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  return initials || (f || l).slice(0, 2).toUpperCase();
}
