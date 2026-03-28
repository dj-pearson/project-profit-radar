import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  RotateCcw,
  ClipboardList,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────

type EquipmentStatus = 'available' | 'checked_out' | 'maintenance';

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  status: EquipmentStatus;
  lastAssignment: string | null;
}

interface Assignment {
  id: string;
  equipmentId: string;
  equipmentName: string;
  projectName: string;
  checkedOutDate: string;
  expectedReturn: string;
  returnedDate: string | null;
  checkedOutBy: string;
}

interface CheckOutFormData {
  equipmentId: string;
  projectName: string;
  expectedReturn: string;
  checkedOutBy: string;
}

interface EquipmentUtilizationDashboardProps {
  companyId?: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────

const INITIAL_EQUIPMENT: EquipmentItem[] = [
  { id: 'eq-001', name: 'CAT 320 Excavator', category: 'Heavy Equipment', status: 'checked_out', lastAssignment: '2026-03-25' },
  { id: 'eq-002', name: 'Bobcat S650 Skid Steer', category: 'Heavy Equipment', status: 'available', lastAssignment: '2026-03-10' },
  { id: 'eq-003', name: 'Honda EU7000is Generator', category: 'Power Equipment', status: 'checked_out', lastAssignment: '2026-03-22' },
  { id: 'eq-004', name: 'Hilti TE 70-ATC Hammer Drill', category: 'Power Tools', status: 'available', lastAssignment: '2026-03-01' },
  { id: 'eq-005', name: 'Wacker Neuson DPU6555 Plate Compactor', category: 'Compaction', status: 'maintenance', lastAssignment: '2026-02-28' },
  { id: 'eq-006', name: 'Genie S-60 Boom Lift', category: 'Aerial Equipment', status: 'available', lastAssignment: '2026-03-15' },
  { id: 'eq-007', name: 'Makita XRM10 Job Site Radio', category: 'Accessories', status: 'available', lastAssignment: '2026-02-10' },
  { id: 'eq-008', name: 'DeWalt DW735 Planer', category: 'Power Tools', status: 'checked_out', lastAssignment: '2026-03-26' },
  { id: 'eq-009', name: 'John Deere 310SL Backhoe', category: 'Heavy Equipment', status: 'available', lastAssignment: '2026-03-18' },
  { id: 'eq-010', name: 'Trimble S9 Total Station', category: 'Survey Equipment', status: 'available', lastAssignment: '2026-02-20' },
];

const INITIAL_ASSIGNMENTS: Assignment[] = [
  { id: 'asg-001', equipmentId: 'eq-001', equipmentName: 'CAT 320 Excavator', projectName: 'Downtown Office Complex', checkedOutDate: '2026-03-25', expectedReturn: '2026-04-10', returnedDate: null, checkedOutBy: 'Mike Reynolds' },
  { id: 'asg-002', equipmentId: 'eq-003', equipmentName: 'Honda EU7000is Generator', projectName: 'Riverside Apartments', checkedOutDate: '2026-03-22', expectedReturn: '2026-04-05', returnedDate: null, checkedOutBy: 'Sarah Chen' },
  { id: 'asg-003', equipmentId: 'eq-008', equipmentName: 'DeWalt DW735 Planer', projectName: 'Heritage Home Renovation', checkedOutDate: '2026-03-26', expectedReturn: '2026-03-31', returnedDate: null, checkedOutBy: 'Tom Bradley' },
  { id: 'asg-004', equipmentId: 'eq-002', equipmentName: 'Bobcat S650 Skid Steer', projectName: 'Lakewood Subdivision', checkedOutDate: '2026-03-01', expectedReturn: '2026-03-10', returnedDate: '2026-03-10', checkedOutBy: 'Mike Reynolds' },
  { id: 'asg-005', equipmentId: 'eq-006', equipmentName: 'Genie S-60 Boom Lift', projectName: 'Downtown Office Complex', checkedOutDate: '2026-03-05', expectedReturn: '2026-03-15', returnedDate: '2026-03-15', checkedOutBy: 'Sarah Chen' },
  { id: 'asg-006', equipmentId: 'eq-004', equipmentName: 'Hilti TE 70-ATC Hammer Drill', projectName: 'Riverside Apartments', checkedOutDate: '2026-02-20', expectedReturn: '2026-03-01', returnedDate: '2026-03-01', checkedOutBy: 'Tom Bradley' },
  { id: 'asg-007', equipmentId: 'eq-009', equipmentName: 'John Deere 310SL Backhoe', projectName: 'Lakewood Subdivision', checkedOutDate: '2026-03-10', expectedReturn: '2026-03-18', returnedDate: '2026-03-18', checkedOutBy: 'Mike Reynolds' },
  { id: 'asg-008', equipmentId: 'eq-010', equipmentName: 'Trimble S9 Total Station', projectName: 'Heritage Home Renovation', checkedOutDate: '2026-02-10', expectedReturn: '2026-02-20', returnedDate: '2026-02-20', checkedOutBy: 'Sarah Chen' },
];

const PROJECTS = [
  'Downtown Office Complex',
  'Riverside Apartments',
  'Heritage Home Renovation',
  'Lakewood Subdivision',
  'Central Park Pavilion',
];

// ─── Helpers ─────────────────────────────────────────────────────────

const TODAY = '2026-03-28';

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusVariant(status: EquipmentStatus): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'available':
      return 'default';
    case 'checked_out':
      return 'secondary';
    case 'maintenance':
      return 'destructive';
  }
}

function statusLabel(status: EquipmentStatus): string {
  switch (status) {
    case 'available':
      return 'Available';
    case 'checked_out':
      return 'Checked Out';
    case 'maintenance':
      return 'Maintenance';
  }
}

// ─── Sub-components ──────────────────────────────────────────────────

interface AssignmentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentName: string;
  assignments: Assignment[];
}

const AssignmentHistoryDialog: React.FC<AssignmentHistoryDialogProps> = ({
  open,
  onOpenChange,
  equipmentName,
  assignments,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Assignment History: {equipmentName}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No assignment history found.
          </p>
        ) : (
          assignments.map((asg) => (
            <Card key={asg.id} className="border">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{asg.projectName}</span>
                  <Badge variant={asg.returnedDate ? 'default' : 'secondary'}>
                    {asg.returnedDate ? 'Returned' : 'Active'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Checked out: {formatDate(asg.checkedOutDate)} by {asg.checkedOutBy}</p>
                  <p>Expected return: {formatDate(asg.expectedReturn)}</p>
                  {asg.returnedDate && <p>Returned: {formatDate(asg.returnedDate)}</p>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DialogContent>
  </Dialog>
);

// ─── Main Component ──────────────────────────────────────────────────

const EquipmentUtilizationDashboard: React.FC<EquipmentUtilizationDashboardProps> = ({
  companyId: _companyId,
}) => {
  const [equipment, setEquipment] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CheckOutFormData>({
    equipmentId: '',
    projectName: '',
    expectedReturn: '',
    checkedOutBy: '',
  });

  // ── Derived data ─────────────────────────────────────────────────

  const currentAssignments = useMemo(
    () => assignments.filter((a) => a.returnedDate === null),
    [assignments],
  );

  const availableEquipment = useMemo(
    () => equipment.filter((e) => e.status === 'available'),
    [equipment],
  );

  const utilizationData = useMemo(() => {
    const lookbackDays = 30;
    return equipment.map((item) => {
      const itemAssignments = assignments.filter((a) => a.equipmentId === item.id);
      let daysAssigned = 0;
      for (const asg of itemAssignments) {
        const start = new Date(asg.checkedOutDate);
        const end = asg.returnedDate ? new Date(asg.returnedDate) : new Date(TODAY);
        const lookbackStart = new Date(TODAY);
        lookbackStart.setDate(lookbackStart.getDate() - lookbackDays);

        const effectiveStart = start < lookbackStart ? lookbackStart : start;
        const effectiveEnd = end > new Date(TODAY) ? new Date(TODAY) : end;

        if (effectiveEnd >= effectiveStart) {
          daysAssigned += daysBetween(
            effectiveStart.toISOString().split('T')[0],
            effectiveEnd.toISOString().split('T')[0],
          );
        }
      }
      const utilization = Math.min(100, Math.round((daysAssigned / lookbackDays) * 100));
      return { ...item, daysAssigned, utilization };
    });
  }, [equipment, assignments]);

  const idleEquipment = useMemo(() => {
    return equipment.filter((item) => {
      if (item.status === 'checked_out') return false;
      if (!item.lastAssignment) return true;
      return daysBetween(item.lastAssignment, TODAY) >= 7;
    });
  }, [equipment]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleCheckOut = useCallback(() => {
    const { equipmentId, projectName, expectedReturn, checkedOutBy } = formData;
    if (!equipmentId || !projectName || !expectedReturn || !checkedOutBy) return;

    const item = equipment.find((e) => e.id === equipmentId);
    if (!item) return;

    const newAssignment: Assignment = {
      id: `asg-${Date.now()}`,
      equipmentId,
      equipmentName: item.name,
      projectName,
      checkedOutDate: TODAY,
      expectedReturn,
      returnedDate: null,
      checkedOutBy,
    };

    setAssignments((prev) => [newAssignment, ...prev]);
    setEquipment((prev) =>
      prev.map((e) =>
        e.id === equipmentId
          ? { ...e, status: 'checked_out' as EquipmentStatus, lastAssignment: TODAY }
          : e,
      ),
    );
    setFormData({ equipmentId: '', projectName: '', expectedReturn: '', checkedOutBy: '' });
    setCheckOutDialogOpen(false);
  }, [formData, equipment]);

  const handleReturn = useCallback((assignmentId: string) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId ? { ...a, returnedDate: TODAY } : a,
      ),
    );
    setEquipment((prev) =>
      prev.map((e) =>
        e.id === assignment.equipmentId
          ? { ...e, status: 'available' as EquipmentStatus, lastAssignment: TODAY }
          : e,
      ),
    );
  }, [assignments]);

  const openHistory = useCallback((equipmentId: string) => {
    setSelectedEquipmentId(equipmentId);
    setHistoryDialogOpen(true);
  }, []);

  const selectedEquipmentAssignments = useMemo(() => {
    if (!selectedEquipmentId) return [];
    return assignments
      .filter((a) => a.equipmentId === selectedEquipmentId)
      .sort((a, b) => new Date(b.checkedOutDate).getTime() - new Date(a.checkedOutDate).getTime());
  }, [selectedEquipmentId, assignments]);

  const selectedEquipmentName = useMemo(() => {
    if (!selectedEquipmentId) return '';
    return equipment.find((e) => e.id === selectedEquipmentId)?.name ?? '';
  }, [selectedEquipmentId, equipment]);

  // ── Summary stats ────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = equipment.length;
    const checkedOut = equipment.filter((e) => e.status === 'checked_out').length;
    const inMaintenance = equipment.filter((e) => e.status === 'maintenance').length;
    const available = equipment.filter((e) => e.status === 'available').length;
    const avgUtilization =
      utilizationData.length > 0
        ? Math.round(utilizationData.reduce((sum, d) => sum + d.utilization, 0) / utilizationData.length)
        : 0;
    return { total, checkedOut, inMaintenance, available, avgUtilization };
  }, [equipment, utilizationData]);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Equipment</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold">{stats.available}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Checked Out</p>
              <p className="text-2xl font-bold">{stats.checkedOut}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wrench className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">In Maintenance</p>
              <p className="text-2xl font-bold">{stats.inMaintenance}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Utilization</p>
              <p className="text-2xl font-bold">{stats.avgUtilization}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="assignments" className="w-full">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="assignments">Current Assignments</TabsTrigger>
            <TabsTrigger value="utilization">Utilization</TabsTrigger>
            <TabsTrigger value="idle">Idle Equipment</TabsTrigger>
          </TabsList>
          <Button onClick={() => setCheckOutDialogOpen(true)} size="sm">
            <Package className="h-4 w-4 mr-2" />
            Check Out Equipment
          </Button>
        </div>

        {/* ── Current Assignments Tab ──────────────────────────────── */}
        <TabsContent value="assignments" className="space-y-4 mt-4">
          {currentAssignments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No equipment is currently checked out.</p>
              </CardContent>
            </Card>
          ) : (
            currentAssignments.map((asg) => {
              const daysUntilReturn = daysBetween(TODAY, asg.expectedReturn);
              const isOverdue = new Date(TODAY) > new Date(asg.expectedReturn);
              return (
                <Card key={asg.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{asg.equipmentName}</span>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Project: <span className="font-medium text-foreground">{asg.projectName}</span>
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Out: {formatDate(asg.checkedOutDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {formatDate(asg.expectedReturn)}
                            {!isOverdue && ` (${daysUntilReturn}d remaining)`}
                          </span>
                          <span>By: {asg.checkedOutBy}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openHistory(asg.equipmentId)}
                        >
                          <ClipboardList className="h-4 w-4 mr-1" />
                          History
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReturn(asg.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Return
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── Utilization Tab ──────────────────────────────────────── */}
        <TabsContent value="utilization" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Equipment Utilization (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {utilizationData
                .sort((a, b) => b.utilization - a.utilization)
                .map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <Badge variant={statusVariant(item.status)} className="text-xs">
                          {statusLabel(item.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {item.daysAssigned}d / 30d
                        </span>
                        <span className="text-sm font-semibold w-12 text-right">
                          {item.utilization}%
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => openHistory(item.id)}
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={item.utilization} className="h-2" />
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Idle Equipment Tab ───────────────────────────────────── */}
        <TabsContent value="idle" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Idle Equipment (Not Assigned for 7+ Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {idleEquipment.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  All equipment has been recently assigned. No idle items detected.
                </p>
              ) : (
                <div className="space-y-3">
                  {idleEquipment.map((item) => {
                    const idleDays = item.lastAssignment
                      ? daysBetween(item.lastAssignment, TODAY)
                      : null;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <span className="font-medium text-sm">{item.name}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground ml-6">
                            <span>Category: {item.category}</span>
                            <Badge variant={statusVariant(item.status)} className="text-xs">
                              {statusLabel(item.status)}
                            </Badge>
                            {idleDays !== null ? (
                              <span className="font-medium text-yellow-700 dark:text-yellow-400">
                                Idle for {idleDays} days
                              </span>
                            ) : (
                              <span className="font-medium text-yellow-700 dark:text-yellow-400">
                                Never assigned
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-6 sm:ml-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openHistory(item.id)}
                          >
                            <ClipboardList className="h-4 w-4 mr-1" />
                            History
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, equipmentId: item.id }));
                              setCheckOutDialogOpen(true);
                            }}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Check Out
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Check Out Dialog ───────────────────────────────────────── */}
      <Dialog open={checkOutDialogOpen} onOpenChange={setCheckOutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Check Out Equipment
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCheckOut();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="checkout-equipment">Equipment</Label>
              <Select
                value={formData.equipmentId}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, equipmentId: val }))
                }
              >
                <SelectTrigger id="checkout-equipment">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {availableEquipment.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-project">Project</Label>
              <Select
                value={formData.projectName}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, projectName: val }))
                }
              >
                <SelectTrigger id="checkout-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECTS.map((project) => (
                    <SelectItem key={project} value={project}>
                      {project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-return-date">Expected Return Date</Label>
              <Input
                id="checkout-return-date"
                type="date"
                value={formData.expectedReturn}
                min={TODAY}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, expectedReturn: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-by">Checked Out By</Label>
              <Input
                id="checkout-by"
                placeholder="Name of person checking out"
                value={formData.checkedOutBy}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, checkedOutBy: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCheckOutDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !formData.equipmentId ||
                  !formData.projectName ||
                  !formData.expectedReturn ||
                  !formData.checkedOutBy
                }
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirm Check Out
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Assignment History Dialog ──────────────────────────────── */}
      <AssignmentHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        equipmentName={selectedEquipmentName}
        assignments={selectedEquipmentAssignments}
      />
    </div>
  );
};

export default EquipmentUtilizationDashboard;
