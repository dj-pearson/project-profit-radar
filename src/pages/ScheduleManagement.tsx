/**
 * The company schedule: every scheduled task, and who is on it (US-329).
 *
 * This page used to fetch projects and hand them to ProjectGanttChart,
 * ScheduleCalendar, ScheduleOverview and ProjectTimeline, none of which made a
 * single Supabase call. They drew one bar per project from start_date to
 * end_date - a picture of the projects list wearing a Gantt's clothes - while
 * the real schedule (schedule_tasks, dependencies, baselines, drag-to-
 * reschedule) lived at /project-schedule and was only reachable per project.
 *
 * This reads schedule_board, the one view over schedule_tasks, so this page,
 * the project hub's Schedule tab and the mobile Schedule item agree. Per-task
 * editing stays on the project schedule, which has the dependency cascade;
 * this is the company-wide view and the place to see unassigned work.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Upload, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { ScheduleTaskAssignees } from '@/components/schedule/ScheduleTaskAssignees';
import { groupTasksByWeek, summariseSchedule, type ScheduleBoardRow } from '@/lib/scheduleBoard';

const ScheduleManagement = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState<ScheduleBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('all');
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [from, setFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [weeks, setWeeks] = useState('4');

  const load = useCallback(async () => {
    if (!userProfile?.company_id) return;
    setLoading(true);

    const until = new Date(from);
    until.setDate(until.getDate() + Number(weeks) * 7);

    const { data, error } = await supabase
      .from('schedule_board')
      .select('schedule_task_id, project_id, project_name, project_status, task_name, start_date, end_date, duration_days, status, assignee_count, assignee_names')
      .eq('company_id', userProfile.company_id)
      .gte('start_date', from)
      .lte('start_date', until.toISOString().split('T')[0])
      .order('start_date');

    if (error) {
      logger.error('Could not load the schedule', error);
      toast({ variant: 'destructive', title: 'Could not load the schedule', description: error.message });
      setRows([]);
    } else {
      setRows((data || []) as ScheduleBoardRow[]);
    }
    setLoading(false);
  }, [userProfile?.company_id, from, weeks, toast]);

  useEffect(() => { void load(); }, [load]);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.project_id, r.project_name);
    return [...map.entries()];
  }, [rows]);

  const filtered = useMemo(
    () => rows.filter((r) =>
      (projectFilter === 'all' || r.project_id === projectFilter) &&
      (!onlyUnassigned || r.assignee_count === 0)
    ),
    [rows, projectFilter, onlyUnassigned]
  );

  const summary = useMemo(() => summariseSchedule(rows), [rows]);
  const byWeek = useMemo(() => groupTasksByWeek(filtered), [filtered]);

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.PROJECT_VIEWERS}>
      <DashboardLayout title="Schedule">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" aria-hidden="true" />
                  Company schedule
                </CardTitle>
                <CardDescription>
                  Every scheduled task across every job, and who is on it. Edit dates and
                  dependencies on a project's own schedule.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/schedule-import')}>
                <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                Import a schedule
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tasks</p>
                  <p className="font-semibold">{summary.total}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nobody assigned</p>
                  <p className="font-semibold">{summary.unassigned}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Crew scheduled</p>
                  <p className="font-semibold">{summary.assignments}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Projects</p>
                  <p className="font-semibold">{projects.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="schedule-from">From</Label>
                  <Input id="schedule-from" type="date" value={from}
                    onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="schedule-weeks">Weeks</Label>
                  <Select value={weeks} onValueChange={setWeeks}>
                    <SelectTrigger id="schedule-weeks"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['1', '2', '4', '8', '12'].map((w) => (
                        <SelectItem key={w} value={w}>{w} week{w === '1' ? '' : 's'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="schedule-project">Project</Label>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger id="schedule-project"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All projects</SelectItem>
                      {projects.map(([id, name]) => (
                        <SelectItem key={id} value={id}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant={onlyUnassigned ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setOnlyUnassigned((v) => !v)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" aria-hidden="true" />
                    Unassigned only
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <Skeleton className="h-96 w-full" />
          ) : byWeek.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Nothing is scheduled in this window. Add tasks on a project's schedule,
                  or import one.
                </p>
              </CardContent>
            </Card>
          ) : (
            byWeek.map((week) => (
              <Card key={week.weekStart}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Week of {new Date(week.weekStart).toLocaleDateString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {week.tasks.map((task) => (
                      <li key={task.schedule_task_id} className="py-3 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{task.task_name}</p>
                            <p className="text-xs text-muted-foreground">
                              <button
                                type="button"
                                className="underline"
                                onClick={() => navigate(`/projects/${task.project_id}#progress`)}
                              >
                                {task.project_name}
                              </button>
                              {' · '}
                              {new Date(task.start_date).toLocaleDateString()}
                              {' · '}
                              {task.duration_days} day{task.duration_days === 1 ? '' : 's'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {task.assignee_count === 0 ? (
                              <Badge variant="outline" className="gap-1">
                                <Users className="h-3 w-3" aria-hidden="true" />
                                Nobody assigned
                              </Badge>
                            ) : (
                              <Badge variant="secondary">{task.assignee_names}</Badge>
                            )}
                            <Badge variant="outline">{task.status}</Badge>
                          </div>
                        </div>
                        <ScheduleTaskAssignees
                          scheduleTaskId={task.schedule_task_id}
                          projectId={task.project_id}
                          onChanged={load}
                        />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default ScheduleManagement;
