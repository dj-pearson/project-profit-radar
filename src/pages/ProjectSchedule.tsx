import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarRange, Plus, Link2, Save, Trash2, GitBranch } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GanttChart } from '@/components/schedule/GanttChart';
import { ProjectHealthBadge } from '@/components/projects/ProjectHealthBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import {
  fetchScheduleTasks,
  fetchDependencies,
  createScheduleTask,
  deleteScheduleTask,
  addDependency,
  rescheduleWithCascade,
  saveBaseline,
  fetchCurrentBaseline,
  type ScheduleBaseline,
} from '@/services/scheduleService';
import {
  parseDate,
  taskEndDate,
  computeScheduleSlipDays,
  type ScheduleTaskRow,
  type ScheduleDependencyRow,
} from '@/lib/schedule/scheduleBoard';
import type { Project as GanttProject, Task as GanttTask, TaskStatus } from '@/types/schedule';

interface ProjectOption {
  id: string;
  name: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const ProjectSchedule = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const companyId = userProfile?.company_id;

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [tasks, setTasks] = useState<ScheduleTaskRow[]>([]);
  const [deps, setDeps] = useState<ScheduleDependencyRow[]>([]);
  const [baseline, setBaseline] = useState<ScheduleBaseline | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [taskDialog, setTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({ name: '', start: todayStr(), duration: '1' });
  const [linkDialog, setLinkDialog] = useState(false);
  const [linkForm, setLinkForm] = useState({ predecessor: '', successor: '' });

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          logger.error('Failed to load projects for schedule', error);
          return;
        }
        const list = (data ?? []) as ProjectOption[];
        setProjects(list);
        setProjectId((current) => current || list[0]?.id || '');
      });
  }, [companyId]);

  const load = useCallback(async () => {
    if (!companyId || !projectId) return;
    setLoading(true);
    try {
      const [t, d, b] = await Promise.all([
        fetchScheduleTasks(projectId, companyId),
        fetchDependencies(projectId, companyId),
        fetchCurrentBaseline(projectId, companyId),
      ]);
      setTasks(t);
      setDeps(d);
      setBaseline(b);
    } catch (err) {
      logger.error('Failed to load schedule', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load schedule.' });
    } finally {
      setLoading(false);
    }
  }, [companyId, projectId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const slipDays = useMemo(
    () => (baseline ? computeScheduleSlipDays(tasks, baseline.tasks) : 0),
    [tasks, baseline]
  );

  // Map DB rows to the in-memory Gantt model (the Gantt recomputes the critical
  // path itself from durations + dependencies).
  const ganttProject = useMemo<GanttProject>(() => {
    const predecessorsByTask = new Map<string, string[]>();
    for (const dep of deps) {
      const list = predecessorsByTask.get(dep.successor_id) ?? [];
      list.push(dep.predecessor_id);
      predecessorsByTask.set(dep.successor_id, list);
    }
    const ganttTasks: GanttTask[] = tasks.map((t) => ({
      id: t.id,
      name: t.name,
      duration: t.duration_days,
      startDate: parseDate(t.start_date),
      endDate: parseDate(taskEndDate(t)),
      dependencies: predecessorsByTask.get(t.id) ?? [],
      resourceId: '',
      status: t.status as TaskStatus,
      isOnCriticalPath: false,
      phase: '',
    }));
    const starts = ganttTasks.map((t) => t.startDate.getTime());
    const ends = ganttTasks.map((t) => t.endDate.getTime());
    return {
      id: projectId || 'schedule',
      name: projects.find((p) => p.id === projectId)?.name ?? 'Schedule',
      template: 'home-renovation',
      startDate: starts.length ? new Date(Math.min(...starts)) : new Date(),
      endDate: ends.length ? new Date(Math.max(...ends)) : new Date(),
      tasks: ganttTasks,
      createdAt: new Date(),
    };
  }, [tasks, deps, projectId, projects]);

  const handleTaskUpdate = async (taskId: string, updates: Partial<GanttTask>) => {
    if (!companyId || !updates.startDate) return;
    const newStartDate = updates.startDate.toISOString().slice(0, 10);
    try {
      await rescheduleWithCascade({ companyId, tasks, deps, movedId: taskId, newStartDate });
      await load();
    } catch (err) {
      logger.error('Failed to reschedule task', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reschedule.' });
    }
  };

  const handleAddTask = async () => {
    if (!companyId || !projectId || !taskForm.name.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter a task name.' });
      return;
    }
    setBusy(true);
    try {
      await createScheduleTask({
        companyId,
        projectId,
        name: taskForm.name.trim(),
        startDate: taskForm.start || todayStr(),
        durationDays: Math.max(1, Number(taskForm.duration) || 1),
        sortOrder: tasks.length,
      });
      setTaskDialog(false);
      setTaskForm({ name: '', start: todayStr(), duration: '1' });
      await load();
    } catch (err) {
      logger.error('Failed to add task', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!companyId || !confirm('Delete this task?')) return;
    try {
      await deleteScheduleTask(id, companyId);
      await load();
    } catch (err) {
      logger.error('Failed to delete task', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete task.' });
    }
  };

  const handleAddDependency = async () => {
    if (!companyId || !projectId || !linkForm.predecessor || !linkForm.successor) {
      toast({ variant: 'destructive', title: 'Pick two tasks', description: 'Choose a predecessor and a successor.' });
      return;
    }
    if (linkForm.predecessor === linkForm.successor) {
      toast({ variant: 'destructive', title: 'Invalid link', description: 'A task cannot depend on itself.' });
      return;
    }
    setBusy(true);
    try {
      await addDependency({
        companyId,
        projectId,
        predecessorId: linkForm.predecessor,
        successorId: linkForm.successor,
      });
      setLinkDialog(false);
      setLinkForm({ predecessor: '', successor: '' });
      await load();
    } catch (err) {
      logger.error('Failed to add dependency', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBaseline = async () => {
    if (!companyId || !projectId || tasks.length === 0) return;
    setBusy(true);
    try {
      await saveBaseline({
        companyId,
        projectId,
        name: `Baseline ${new Date().toLocaleDateString()}`,
        tasks,
      });
      toast({ title: 'Baseline saved', description: 'Current schedule captured as the baseline.' });
      await load();
    } catch (err) {
      logger.error('Failed to save baseline', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.PROJECT_EDITORS}>
      <DashboardLayout title="Project Schedule">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <CalendarRange className="h-6 w-6" aria-hidden="true" /> Project Schedule
              </h1>
              <p className="text-sm text-muted-foreground">
                Gantt with task dependencies, critical-path highlighting, drag-to-reschedule (dependents cascade), and baseline comparison.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="sched-project">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="sched-project" className="w-[14rem]">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => setLinkDialog(true)} disabled={tasks.length < 2}>
                <Link2 className="mr-1 h-4 w-4" /> Link
              </Button>
              <Button variant="outline" onClick={handleSaveBaseline} disabled={busy || tasks.length === 0}>
                <Save className="mr-1 h-4 w-4" /> Save baseline
              </Button>
              <Button onClick={() => setTaskDialog(true)} disabled={!projectId}>
                <Plus className="mr-1 h-4 w-4" /> Add task
              </Button>
            </div>
          </div>

          {projectId && (
            <Card>
              <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-sm">
                <span>
                  <span className="text-muted-foreground">Tasks: </span>
                  <span className="font-semibold">{tasks.length}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Dependencies: </span>
                  <span className="font-semibold">{deps.length}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Baseline: </span>
                  <span className="font-semibold">{baseline ? baseline.name : 'none saved'}</span>
                </span>
                {baseline && (
                  <span>
                    <span className="text-muted-foreground">Slip vs baseline: </span>
                    <span className={`font-semibold ${slipDays > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {slipDays > 0 ? `${slipDays} day${slipDays === 1 ? '' : 's'}` : 'on track'}
                    </span>
                  </span>
                )}
                <ProjectHealthBadge
                  status="active"
                  scheduleSlipDays={baseline ? slipDays : undefined}
                  end_date={ganttProject.endDate.toISOString()}
                />
              </CardContent>
            </Card>
          )}

          {loading ? (
            <Skeleton className="h-80 w-full" />
          ) : !projectId ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Select a project to view its schedule.</CardContent></Card>
          ) : tasks.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No schedule tasks yet. Add one to start building the Gantt.</CardContent></Card>
          ) : (
            <>
              <GanttChart project={ganttProject} onTaskUpdate={handleTaskUpdate} onAddTask={() => setTaskDialog(true)} />

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GitBranch className="h-4 w-4" aria-hidden="true" /> Tasks &amp; dependencies
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  {ganttProject.tasks.map((t) => {
                    const predNames = t.dependencies
                      .map((id) => tasks.find((x) => x.id === id)?.name)
                      .filter(Boolean);
                    return (
                      <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <div className="text-sm">
                          <span className="font-medium">{t.name}</span>
                          <span className="ml-2 text-muted-foreground">
                            {t.startDate.toISOString().slice(0, 10)} · {t.duration}d
                          </span>
                          {predNames.length > 0 && (
                            <Badge variant="outline" className="ml-2">after {predNames.join(', ')}</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTask(t.id)}
                          aria-label={`Delete task ${t.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Add task dialog */}
        <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Schedule Task</DialogTitle>
              <DialogDescription>Add a task with a start date and duration.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="t-name">Name</Label>
                <Input id="t-name" value={taskForm.name} onChange={(e) => setTaskForm((f) => ({ ...f, name: e.target.value }))} placeholder="Framing" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="t-start">Start date</Label>
                  <Input id="t-start" type="date" value={taskForm.start} onChange={(e) => setTaskForm((f) => ({ ...f, start: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-duration">Duration (days)</Label>
                  <Input id="t-duration" type="number" min="1" value={taskForm.duration} onChange={(e) => setTaskForm((f) => ({ ...f, duration: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskDialog(false)} disabled={busy}>Cancel</Button>
              <Button onClick={handleAddTask} disabled={busy}>{busy ? 'Adding…' : 'Add Task'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Link dependency dialog */}
        <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Tasks (Finish-to-Start)</DialogTitle>
              <DialogDescription>The successor starts after the predecessor finishes.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="dep-pred">Predecessor</Label>
                <Select value={linkForm.predecessor} onValueChange={(v) => setLinkForm((f) => ({ ...f, predecessor: v }))}>
                  <SelectTrigger id="dep-pred"><SelectValue placeholder="Select task" /></SelectTrigger>
                  <SelectContent>
                    {tasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dep-succ">Successor</Label>
                <Select value={linkForm.successor} onValueChange={(v) => setLinkForm((f) => ({ ...f, successor: v }))}>
                  <SelectTrigger id="dep-succ"><SelectValue placeholder="Select task" /></SelectTrigger>
                  <SelectContent>
                    {tasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialog(false)} disabled={busy}>Cancel</Button>
              <Button onClick={handleAddDependency} disabled={busy}>{busy ? 'Linking…' : 'Add Dependency'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default ProjectSchedule;
