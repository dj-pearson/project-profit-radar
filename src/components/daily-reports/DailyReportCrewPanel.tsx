/**
 * The crew on a daily report, and whether it matches the timesheets (US-330).
 *
 * Crew was daily_reports.crew_count: one integer, typed by hand, for people who
 * had already clocked in against the same project on the same day. Two records
 * of the same fact, no way to say which was right, and payroll finding out
 * later. daily_report_crew_items had existed since 20251110000003 and was
 * queried by no file in src/.
 *
 * The pull happens in the database (sync_daily_report_crew) so it behaves the
 * same from here, from the mobile report and from whatever iOS grows. This
 * shows the result, keeps it editable, and says plainly where the report and
 * the timesheets disagree.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Users, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import {
  crewFromTimeEntries, totalCrewHours, reconcileDailyReport,
  type TimeEntryLike,
} from '@/lib/dailyReportField';

interface CrewItem {
  id: string;
  user_id: string | null;
  crew_member_name: string;
  role: string | null;
  hours_worked: number | null;
  overtime_hours: number | null;
}

interface Props {
  dailyReportId: string;
  projectId: string;
  reportDate: string;
  reportedCrewCount: number;
  onChanged?: () => void;
}

export function DailyReportCrewPanel({
  dailyReportId, projectId, reportDate, reportedCrewCount, onChanged,
}: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<CrewItem[]>([]);
  const [timesheet, setTimesheet] = useState<TimeEntryLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: crew, error: crewError }, { data: entries, error: entryError }] =
      await Promise.all([
        supabase
          .from('daily_report_crew_items')
          .select('id, user_id, crew_member_name, role, hours_worked, overtime_hours')
          .eq('daily_report_id', dailyReportId)
          .order('crew_member_name'),
        supabase
          .from('time_entries')
          // The FK has to be named. There is no inferable relation between
          // time_entries and user_profiles, so the bare embed returns a
          // SelectQueryError at runtime and this panel shows no timesheet at
          // all. useTimesheetApproval.ts already uses this hint.
          .select('user_id, total_hours, user_profiles!time_entries_user_id_fkey(first_name, last_name, role)')
          .eq('project_id', projectId)
          .gte('start_time', `${reportDate}T00:00:00`)
          .lte('start_time', `${reportDate}T23:59:59`),
      ]);

    if (crewError || entryError) {
      logger.error('Could not load the crew for a daily report', crewError || entryError);
      toast({
        variant: 'destructive',
        title: 'Could not load the crew',
        description: (crewError || entryError)?.message,
      });
    }

    setItems((crew || []) as CrewItem[]);
    setTimesheet(((entries || []) as Array<{
      user_id: string;
      total_hours: number | null;
      user_profiles?: { first_name: string | null; last_name: string | null; role: string | null } | null;
    }>).map((e) => ({
      user_id: e.user_id,
      total_hours: e.total_hours,
      first_name: e.user_profiles?.first_name,
      last_name: e.user_profiles?.last_name,
      role: e.user_profiles?.role,
    })));
    setLoading(false);
  }, [dailyReportId, projectId, reportDate, toast]);

  useEffect(() => { void load(); }, [load]);

  const fromTimesheets = useMemo(() => crewFromTimeEntries(timesheet), [timesheet]);

  const reportedHours = useMemo(
    () => totalCrewHours(items.map((i) => ({
      user_id: i.user_id ?? i.id,
      crew_member_name: i.crew_member_name,
      role: i.role,
      hours_worked: Number(i.hours_worked) || 0,
      overtime_hours: Number(i.overtime_hours) || 0,
    }))),
    [items]
  );

  const reconciliation = useMemo(
    () => reconcileDailyReport({
      reportedCrew: items.length || reportedCrewCount,
      timesheetCrew: fromTimesheets.length,
      reportedHours,
      timesheetHours: totalCrewHours(fromTimesheets),
    }),
    [items.length, reportedCrewCount, fromTimesheets, reportedHours]
  );

  const pull = async () => {
    setSyncing(true);
    const { data, error } = await supabase
      .rpc('sync_daily_report_crew', { p_daily_report_id: dailyReportId });
    setSyncing(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Could not pull the crew',
        description: error.message,
      });
      return;
    }
    toast({
      title: (data ?? 0) > 0
        ? `${data} crew member(s) added`
        : 'Nothing new to pull',
      description: (data ?? 0) > 0
        ? 'From the time entries on this job today. Edit anything that is wrong.'
        : 'Everyone who clocked in is already on this report.',
    });
    void load();
    onChanged?.();
  };

  const updateHours = async (item: CrewItem, field: 'hours_worked' | 'overtime_hours', value: number) => {
    const previous = items;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [field]: value } : i)));

    const { error } = await supabase
      .from('daily_report_crew_items')
      .update({ [field]: value } as never)
      .eq('id', item.id);

    if (error) {
      setItems(previous);
      toast({ variant: 'destructive', title: 'Could not save that', description: error.message });
    }
  };

  const remove = async (item: CrewItem) => {
    const { error } = await supabase
      .from('daily_report_crew_items')
      .delete()
      .eq('id', item.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not remove them', description: error.message });
      return;
    }
    void load();
    onChanged?.();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" aria-hidden="true" />
            Crew
          </CardTitle>
          <CardDescription>
            Pulled from the hours clocked on this job today. Edit anything that is wrong.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={pull} disabled={syncing}>
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          {syncing ? 'Pulling...' : 'Pull from timesheets'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {fromTimesheets.length > 0
              ? `${fromTimesheets.length} person(s) clocked in on this job today. Pull them in rather than typing them again.`
              : 'Nobody has clocked in on this job today.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 px-3 font-medium">Role</th>
                  <th className="py-2 px-3 font-medium text-right">Hours</th>
                  <th className="py-2 px-3 font-medium text-right">Overtime</th>
                  <th className="py-2 pl-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{item.crew_member_name}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {item.role ? item.role.replace(/_/g, ' ') : ''}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Input
                        type="number" min={0} step="0.25"
                        className="w-24 ml-auto text-right"
                        aria-label={`Hours for ${item.crew_member_name}`}
                        value={item.hours_worked ?? 0}
                        onChange={(e) => updateHours(item, 'hours_worked', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Input
                        type="number" min={0} step="0.25"
                        className="w-24 ml-auto text-right"
                        aria-label={`Overtime for ${item.crew_member_name}`}
                        value={item.overtime_hours ?? 0}
                        onChange={(e) => updateHours(item, 'overtime_hours', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <Button
                        type="button" variant="ghost" size="sm"
                        aria-label={`Remove ${item.crew_member_name} from this report`}
                        onClick={() => remove(item)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="py-2 pr-3">{items.length} on site</td>
                  <td />
                  <td className="py-2 px-3 text-right" colSpan={2}>
                    <Badge variant="outline">{reportedHours}h total</Badge>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {!reconciliation.agrees && (
          <Alert>
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              This report and the timesheets disagree: {reconciliation.message}.
              Payroll will use the timesheets.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default DailyReportCrewPanel;
