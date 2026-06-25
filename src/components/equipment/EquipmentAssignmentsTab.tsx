/**
 * Equipment Assignments tab (US-080).
 *
 * Lists equipment-to-project assignments, supports check-out (reusing
 * EquipmentAssignmentForm) and return, and shows a utilization dashboard with
 * per-equipment utilization rate, an idle-equipment list, and the assignment
 * timeline (EquipmentGanttChart). All queries are company_id-scoped (RLS).
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Truck, PackageCheck, Clock, Activity, CalendarClock } from 'lucide-react';
import EquipmentAssignmentForm from '@/components/equipment/EquipmentAssignmentForm';
import EquipmentGanttChart from '@/components/equipment/EquipmentGanttChart';
import {
  computeEquipmentUtilization,
  IDLE_THRESHOLD_DAYS,
  type EquipmentLike,
  type AssignmentLike,
} from '@/lib/equipment/utilization';

interface AssignmentRow extends AssignmentLike {
  id: string;
  assigned_quantity: number | null;
}

interface EquipmentRow extends EquipmentLike {
  id: string;
  name: string;
  status: string | null;
}

const ACTIVE_STATUSES = new Set(['active', 'assigned', 'in_use', 'checked_out', 'in_progress']);

function fmtDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export function EquipmentAssignmentsTab() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = userProfile?.company_id;
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['equipment-assignments-tab', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const [assignmentsRes, equipmentRes, projectsRes] = await Promise.all([
        supabase
          .from('equipment_assignments')
          .select(
            'id, equipment_id, project_id, start_date, end_date, planned_start_date, planned_end_date, actual_start_date, actual_end_date, assignment_status, assigned_quantity'
          )
          .eq('company_id', companyId),
        supabase.from('equipment').select('id, name, status').eq('company_id', companyId),
        supabase.from('projects').select('id, name').eq('company_id', companyId),
      ]);
      if (assignmentsRes.error) throw assignmentsRes.error;
      return {
        assignments: (assignmentsRes.data ?? []) as AssignmentRow[],
        equipment: (equipmentRes.data ?? []) as EquipmentRow[],
        projectNames: new Map(
          ((projectsRes.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
        ),
      };
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (assignment: AssignmentRow) => {
      const today = new Date().toISOString().slice(0, 10);
      const { error: aErr } = await supabase
        .from('equipment_assignments')
        .update({ actual_end_date: today, assignment_status: 'completed' })
        .eq('id', assignment.id);
      if (aErr) throw aErr;
      // Free the equipment so it can be re-assigned.
      const { error: eErr } = await supabase
        .from('equipment')
        .update({ status: 'available' })
        .eq('id', assignment.equipment_id);
      if (eErr) throw eErr;
    },
    onSuccess: () => {
      toast({ title: 'Equipment returned', description: 'Assignment closed and equipment freed.' });
      queryClient.invalidateQueries({ queryKey: ['equipment-assignments-tab', companyId] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
    onError: (e: unknown) => {
      toast({
        title: 'Could not return equipment',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });

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

  const handleCheckoutSuccess = () => {
    setCheckoutOpen(false);
    toast({ title: 'Equipment checked out', description: 'Assignment created.' });
    queryClient.invalidateQueries({ queryKey: ['equipment-assignments-tab', companyId] });
    queryClient.invalidateQueries({ queryKey: ['equipment'] });
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
            onAssignmentChange={() =>
              queryClient.invalidateQueries({ queryKey: ['equipment-assignments-tab', companyId] })
            }
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
