/**
 * The scheduled work assigned to me (US-329).
 *
 * `tasks` and `schedule_tasks` are two different things and a crew member has
 * both: the to-do list, and the dated work on the Gantt they are expected on
 * site for. My Tasks only ever showed the first, so a superintendent could read
 * an empty page on a morning they were scheduled to frame a house.
 *
 * AGENTS.md records which table holds what; this component is the reason the
 * distinction is not confusing in practice - both lists appear on one screen.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { CalendarDays } from 'lucide-react';
import { groupTasksByWeek, type ScheduleBoardRow } from '@/lib/scheduleBoard';

export function MyScheduledWork() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<ScheduleBoardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userProfile?.id) return;
    setLoading(true);

    const { data: assignments, error: assignError } = await supabase
      .from('schedule_task_assignees')
      .select('schedule_task_id')
      .eq('crew_member_id', userProfile.id);

    if (assignError) {
      logger.error('Could not load my scheduled work', assignError);
      setRows([]);
      setLoading(false);
      return;
    }

    const ids = (assignments || []).map((a: { schedule_task_id: string }) => a.schedule_task_id);
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // Only what is still ahead or current. A crew member does not need last
    // spring's framing on their morning list.
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data, error } = await supabase
      .from('schedule_board')
      .select('schedule_task_id, project_id, project_name, project_status, task_name, start_date, end_date, duration_days, status, assignee_count, assignee_names')
      .in('schedule_task_id', ids)
      .gte('start_date', since.toISOString().split('T')[0])
      .order('start_date');

    if (error) {
      logger.error('Could not load my schedule board rows', error);
      setRows([]);
    } else {
      setRows((data || []) as ScheduleBoardRow[]);
    }
    setLoading(false);
  }, [userProfile?.id]);

  useEffect(() => { void load(); }, [load]);

  const weeks = groupTasksByWeek(rows);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Where I am scheduled
        </CardTitle>
        <CardDescription>
          Dated work from the project schedule. Separate from the to-do list above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : weeks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nothing on the schedule for you. A supervisor assigns scheduled work from
            the project schedule.
          </p>
        ) : (
          <div className="space-y-4">
            {weeks.map((week) => (
              <div key={week.weekStart}>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Week of {new Date(week.weekStart).toLocaleDateString()}
                </p>
                <ul className="divide-y">
                  {week.tasks.map((task) => (
                    <li
                      key={task.schedule_task_id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.task_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.project_name} · {new Date(task.start_date).toLocaleDateString()}
                          {' · '}{task.duration_days} day{task.duration_days === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{task.status}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/projects/${task.project_id}#progress`)}
                        >
                          Open
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MyScheduledWork;
