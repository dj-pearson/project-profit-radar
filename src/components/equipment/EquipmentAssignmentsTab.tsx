/**
 * Equipment Assignments tab (US-080).
 *
 * Lists equipment-to-project assignments, supports check-out (reusing
 * EquipmentAssignmentForm) and return, and shows a utilization dashboard with
 * per-equipment utilization rate, an idle-equipment list, and the assignment
 * timeline (EquipmentGanttChart). All queries are company_id-scoped (RLS).
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/common/ErrorState';
import { useEquipmentAssignmentsTab, type AssignmentRow } from '@/hooks/useEquipmentAssignmentsTab';
import { useToast } from '@/hooks/use-toast';
import { Plus, Truck, PackageCheck, Clock, Activity, CalendarClock } from 'lucide-react';
import EquipmentAssignmentForm from '@/components/equipment/EquipmentAssignmentForm';
import EquipmentGanttChart from '@/components/equipment/EquipmentGanttChart';
import {
  computeEquipmentUtilization,
  IDLE_THRESHOLD_DAYS,
} from '@/lib/equipment/utilization';

const ACTIVE_STATUSES = new Set(['active', 'assigned', 'in_use', 'checked_out', 'in_progress']);

function fmtDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export function EquipmentAssignmentsTab() {
  const { toast } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { data, isLoading, error, refetch, returnAssignment, invalidate } = useEquipmentAssignmentsTab();

  const returnMutation = {
    isPending: returnAssignment.isPending,
    mutate: (assignment: AssignmentRow) =>
      returnAssignment.mutate(assignment, {
        onSuccess: () => {
          toast({ title: 'Equipment returned', description: 'Assignment closed and equipment freed.' });
        },
        onError: (e: unknown) => {
          toast({
            title: 'Could not return equipment',
            description: e instanceof Error ? e.message : 'Please try again.',
            variant: 'destructive',
          });
        },
      }),
  };

  const equipmentNames = useMemo(
    () => new Map((data?.equipment ?? []).map((e) => [e.id, e.name])),
    [data]
  );

  const utilization = useMemo(() => {
    if (!data) return null;
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return computeEquipmentUtilization(data.equipment, data.assignments, {
      windowStart: start,
      windowEnd: end,
    });
  }, [data]);

  const activeAssignments = useMemo(
    () =>
      (data?.assignments ?? []).filter(
        (a) =>
          !a.actual_end_date &&
          ACTIVE_STATUSES.has((a.assignment_status ?? '').toLowerCase())
      ),
    [data]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        inline
        title="Equipment assignments could not be loaded"
        error={error as Error}
        onRetry={() => { void refetch(); }}
      />
    );
  }

  const handleCheckoutSuccess = () => {
    setCheckoutOpen(false);
    toast({ title: 'Equipment checked out', description: 'Assignment created.' });
    invalidate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Equipment Assignments</h2>
          <p className="text-sm text-muted-foreground">
            Check equipment out to projects, track utilization, and spot idle assets.
          </p>
        </div>
        <Button onClick={() => setCheckoutOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Check Out Equipment
        </Button>
      </div>

      {/* Utilization summary */}
      {utilization && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryStat label="Avg Utilization" value={`${Math.round(utilization.totals.avgUtilization * 100)}%`} icon={Activity} />
          <SummaryStat label="Currently Assigned" value={String(utilization.totals.currentlyAssigned)} icon={PackageCheck} />
          <SummaryStat label={`Idle (${IDLE_THRESHOLD_DAYS}+ days)`} value={String(utilization.totals.idleCount)} icon={Clock} tone="warn" />
          <SummaryStat label="Fleet Size" value={String(utilization.totals.equipmentCount)} icon={Truck} />
        </div>
      )}

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="idle">Idle</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Active assignments */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Assignments</CardTitle>
              <CardDescription>Equipment currently checked out to projects.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeAssignments.length === 0 ? (
                <EmptyState
                  icon={PackageCheck}
                  title="No active assignments"
                  description="Check out equipment to a project to start tracking it here."
                  actionLabel="Check Out Equipment"
                  onAction={() => setCheckoutOpen(true)}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Equipment</th>
                        <th className="py-2 px-3 font-medium">Project</th>
                        <th className="py-2 px-3 font-medium">Start</th>
                        <th className="py-2 px-3 font-medium">Expected Return</th>
                        <th className="py-2 px-3 font-medium">Qty</th>
                        <th className="py-2 px-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeAssignments.map((a) => (
                        <tr key={a.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">
                            {equipmentNames.get(a.equipment_id) ?? 'Unknown'}
                          </td>
                          <td className="py-2 px-3">{data?.projectNames.get(a.project_id ?? '') ?? '—'}</td>
                          <td className="py-2 px-3">{fmtDate(a.actual_start_date ?? a.start_date)}</td>
                          <td className="py-2 px-3">{fmtDate(a.planned_end_date ?? a.end_date)}</td>
                          <td className="py-2 px-3">{a.assigned_quantity ?? 1}</td>
                          <td className="py-2 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => returnMutation.mutate(a)}
                              disabled={returnMutation.isPending}
                            >
                              Return
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Utilization per equipment */}
        <TabsContent value="utilization">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Utilization (last 30 days)</CardTitle>
              <CardDescription>Assigned days ÷ days in the window, per equipment item.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!utilization || utilization.rows.length === 0 ? (
                <EmptyState icon={Activity} title="No equipment yet" description="Add equipment to your fleet to track utilization." />
              ) : (
                utilization.rows.map((r) => (
                  <div key={r.equipmentId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground">
                        {Math.round(r.utilizationRate * 100)}% · {r.assignedDays}/{r.windowDays}d
                        {r.isCurrentlyAssigned && (
                          <Badge variant="secondary" className="ml-2 text-xs">Assigned</Badge>
                        )}
                      </span>
                    </div>
                    <Progress value={Math.round(r.utilizationRate * 100)} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Idle equipment */}
        <TabsContent value="idle">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Idle Equipment</CardTitle>
              <CardDescription>Not assigned for {IDLE_THRESHOLD_DAYS}+ days — candidates to redeploy or off-rent.</CardDescription>
            </CardHeader>
            <CardContent>
              {!utilization || utilization.rows.filter((r) => r.isIdle).length === 0 ? (
                <EmptyState icon={CalendarClock} title="Nothing idle" description={`All equipment has been assigned within the last ${IDLE_THRESHOLD_DAYS} days.`} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Equipment</th>
                        <th className="py-2 px-3 font-medium">Status</th>
                        <th className="py-2 px-3 font-medium text-right">Days Idle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {utilization.rows
                        .filter((r) => r.isIdle)
                        .map((r) => (
                          <tr key={r.equipmentId} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium">{r.name}</td>
                            <td className="py-2 px-3 capitalize">{r.status}</td>
                            <td className="py-2 px-3 text-right">
                              {r.daysSinceLastAssignment == null ? 'Never assigned' : `${r.daysSinceLastAssignment}d`}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignment timeline (history) */}
        <TabsContent value="timeline">
          <EquipmentGanttChart
            onAssignmentChange={() => invalidate(false)}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Check Out Equipment</DialogTitle>
          </DialogHeader>
          <EquipmentAssignmentForm
            onSuccess={handleCheckoutSuccess}
            onCancel={() => setCheckoutOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  icon: typeof Truck;
  tone?: 'neutral' | 'warn';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${tone === 'warn' ? 'text-amber-600' : 'text-muted-foreground'}`} aria-hidden="true" />
        </div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default EquipmentAssignmentsTab;
