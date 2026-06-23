import React, { useEffect, useMemo, useState } from 'react';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Download, FileText, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Skeleton } from '@/components/ui/skeleton';
import { exportRowsToCsv } from '@/lib/exportCsv';
import {
  hoursByProject, hoursByEmployee, hoursByDayOfWeek, totalHours,
  type TimeEntryInput, type ProjectMeta, type EmployeeMeta,
} from '@/lib/reports/timeReports';

function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

const TimeReports: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimeEntryInput[]>([]);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [employees, setEmployees] = useState<EmployeeMeta[]>([]);
  const [dateFrom, setDateFrom] = useState<string>(defaultStart());
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().slice(0, 10));
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const load = async () => {
    if (!userProfile?.company_id) return;
    try {
      setLoading(true);
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('id, name, estimated_hours')
        .eq('company_id', userProfile.company_id);
      if (projErr) throw projErr;
      const projectList = (projData ?? []) as ProjectMeta[];
      setProjects(projectList);

      const projectIds = projectList.map((p) => p.id);
      if (projectIds.length === 0) {
        setEntries([]);
      } else {
        const { data: entryData, error: entryErr } = await supabase
          .from('time_entries')
          .select('id, user_id, project_id, start_time, end_time, total_hours, break_duration')
          .in('project_id', projectIds)
          .order('start_time', { ascending: false });
        if (entryErr) throw entryErr;
        setEntries((entryData ?? []) as TimeEntryInput[]);
      }

      const { data: empData } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .eq('company_id', userProfile.company_id);
      setEmployees(
        (empData ?? []).map((u: { id: string; first_name: string | null; last_name: string | null; email: string }) => ({
          id: u.id,
          name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email,
        }))
      );
    } catch (error) {
      logger.error('Error loading time reports', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to load time reports', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.company_id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.company_id]);

  const filteredEntries = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : -Infinity;
    const toTs = dateTo ? new Date(dateTo).getTime() + 86_400_000 : Infinity; // inclusive end day
    return entries.filter((e) => {
      const ts = new Date(e.start_time).getTime();
      if (ts < fromTs || ts >= toTs) return false;
      if (projectFilter !== 'all' && e.project_id !== projectFilter) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo, projectFilter]);

  const byProject = useMemo(() => hoursByProject(filteredEntries, projects), [filteredEntries, projects]);
  const byEmployee = useMemo(() => hoursByEmployee(filteredEntries, employees), [filteredEntries, employees]);
  const byDay = useMemo(() => hoursByDayOfWeek(filteredEntries), [filteredEntries]);
  const grandTotal = useMemo(() => totalHours(filteredEntries), [filteredEntries]);
  const overtimeTotal = useMemo(() => byEmployee.reduce((s, e) => s + e.overtimeHours, 0), [byEmployee]);

  const handleExportCsv = () => {
    exportRowsToCsv(`time-by-employee-${dateFrom}_${dateTo}.csv`, byEmployee, [
      { header: 'Employee', value: (r) => r.employeeName },
      { header: 'Total Hours', value: (r) => r.totalHours },
      { header: 'Regular Hours', value: (r) => r.regularHours },
      { header: 'Overtime Hours', value: (r) => r.overtimeHours },
    ]);
    toast({ title: 'Exported', description: 'Time report downloaded as CSV.' });
  };

  const handleExportPdf = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Time Tracking Report', 14, 18);
      doc.setFontSize(10);
      doc.text(`${dateFrom} to ${dateTo}  •  Total ${grandTotal} hrs`, 14, 25);
      autoTable(doc, {
        startY: 32,
        head: [['Project', 'Actual Hrs', 'Budgeted Hrs', 'Variance']],
        body: byProject.map((p) => [
          p.projectName, String(p.hours),
          p.estimatedHours != null ? String(p.estimatedHours) : '—',
          p.variance != null ? String(p.variance) : '—',
        ]),
      });
      const projectEndY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 82;
      autoTable(doc, {
        startY: projectEndY + 8,
        head: [['Employee', 'Total', 'Regular', 'Overtime']],
        body: byEmployee.map((e) => [e.employeeName, String(e.totalHours), String(e.regularHours), String(e.overtimeHours)]),
      });
      doc.save(`time-report-${dateFrom}_${dateTo}.pdf`);
      toast({ title: 'Exported', description: 'Time report downloaded as PDF.' });
    } catch (error) {
      logger.error('Error exporting time PDF', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' });
    }
  };

  return (
    <AccessiblePageWrapper pageTitle="Time Reports">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Time Reports</h1>
            <p className="text-muted-foreground">Labor hours and productivity across projects and crews</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCsv} disabled={loading || byEmployee.length === 0}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              CSV
            </Button>
            <Button variant="outline" onClick={handleExportPdf} disabled={loading || filteredEntries.length === 0}>
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="search" aria-label="Filter time reports">
              <div>
                <Label htmlFor="time-from">From</Label>
                <Input id="time-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="time-to">To</Label>
                <Input id="time-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="time-project">Project</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger id="time-project"><SelectValue placeholder="All projects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="rounded-md bg-muted/40 px-3 py-2 w-full">
                  <div className="text-xs text-muted-foreground">Total Hours</div>
                  <div className="text-xl font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-construction-orange" aria-hidden="true" />
                    {grandTotal}
                    {overtimeTotal > 0 && (
                      <Badge variant="destructive" className="ml-1">{overtimeTotal} OT</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72" /><Skeleton className="h-72" />
          </div>
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Hours by Project</CardTitle></CardHeader>
                <CardContent>
                  {byProject.length === 0 ? (
                    <p className="text-muted-foreground py-12 text-center">No time entries in this range.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={byProject} layout="vertical" margin={{ left: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="projectName" width={120} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="hours" name="Actual hrs" fill="#f97316" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="estimatedHours" name="Budgeted hrs" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Hours by Day of Week</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={byDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hours" name="Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Budgeted vs actual table */}
            <Card>
              <CardHeader><CardTitle>Budgeted vs Actual Hours</CardTitle></CardHeader>
              <CardContent>
                {byProject.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center">No data.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Budgeted</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byProject.map((p) => (
                        <TableRow key={p.projectId ?? 'none'}>
                          <TableCell className="font-medium">{p.projectName}</TableCell>
                          <TableCell className="text-right">{p.hours}</TableCell>
                          <TableCell className="text-right">{p.estimatedHours ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            {p.variance == null ? '—' : (
                              <span className={p.variance > 0 ? 'text-destructive' : 'text-green-600'}>
                                {p.variance > 0 ? '+' : ''}{p.variance}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Employee table */}
            <Card>
              <CardHeader><CardTitle>Hours by Employee</CardTitle></CardHeader>
              <CardContent>
                {byEmployee.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center">No employee hours in this range.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Total Hours</TableHead>
                        <TableHead className="text-right">Regular</TableHead>
                        <TableHead className="text-right">Overtime</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byEmployee.map((e) => (
                        <TableRow key={e.userId}>
                          <TableCell className="font-medium">{e.employeeName}</TableCell>
                          <TableCell className="text-right font-semibold">{e.totalHours}</TableCell>
                          <TableCell className="text-right">{e.regularHours}</TableCell>
                          <TableCell className="text-right">
                            {e.overtimeHours > 0 ? (
                              <Badge variant="destructive">{e.overtimeHours}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AccessiblePageWrapper>
  );
};

export default TimeReports;
