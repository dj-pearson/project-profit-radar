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
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useDailyReportCrew, type DailyReportCrewItem } from '@/hooks/useDailyReportCrew';
import { ErrorState } from '@/components/common/ErrorState';
import { Users, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import {
  crewFromTimeEntries, totalCrewHours, reconcileDailyReport,
} from '@/lib/dailyReportField';
import { confirmAction } from "@/components/ui/confirm-dialog";

type CrewItem = DailyReportCrewItem;

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
  const {
    items, timesheet, isLoading: loading, error: loadError, refetch,
    setHours, remove: removeItem, pull: pullCrew, isPulling: syncing,
  } = useDailyReportCrew(dailyReportId, projectId, reportDate);

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
    let added: number;
    try {
      added = await pullCrew();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not pull the crew',
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    }
    toast({
      title: added > 0
        ? `${added} crew member(s) added`
        : 'Nothing new to pull',
      description: added > 0
        ? 'From the time entries on this job today. Edit anything that is wrong.'
        : 'Everyone who clocked in is already on this report.',
    });
    onChanged?.();
  };

  const updateHours = async (item: CrewItem, field: 'hours_worked' | 'overtime_hours', value: number) => {
    // Optimistic in the hook; it rolls back when the write fails.
    try {
      await setHours(item.id, field, value);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save that',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const remove = async (item: CrewItem) => {
    if (!(await confirmAction({ title: 'Remove this crew entry from the report?', confirmLabel: 'Remove', destructive: true }))) return;
    try {
      await removeItem(item.id);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not remove them',
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    }
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
        ) : loadError ? (
          <ErrorState
            inline
            title="Could not load the crew"
            error={loadError}
            onRetry={() => { void refetch(); }}
          />
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

        {!loading && !loadError && !reconciliation.agrees && (
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
