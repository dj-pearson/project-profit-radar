import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TimeEntry {
  id: string;
  hours: number;
  overtime_hours?: number;
  date: string;
  project_id?: string;
  user_id?: string;
  projects?: { name: string } | null;
  user_profiles?: { first_name: string; last_name: string } | null;
}

interface ProjectBudget {
  id: string;
  name: string;
  budget_hours?: number;
}

const OVERTIME_THRESHOLD = 40;

const TimeTrackingReports: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const { data: timeEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ['time-entries-report', userProfile?.company_id, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('time_entries')
        .select('*, projects(name), user_profiles(first_name, last_name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (userProfile?.company_id) {
        query = query.eq('company_id', userProfile.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TimeEntry[];
    },
    enabled: !!userProfile,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-budget', userProfile?.company_id],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('id, name, budget_hours');

      if (userProfile?.company_id) {
        query = query.eq('company_id', userProfile.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProjectBudget[];
    },
    enabled: !!userProfile,
  });

  const hoursByProject = useMemo(() => {
    if (!timeEntries) return [];
    const map = new Map<string, number>();
    for (const entry of timeEntries) {
      const projectName = entry.projects?.name || 'Unassigned';
      map.set(projectName, (map.get(projectName) || 0) + (entry.hours || 0));
    }
    return Array.from(map.entries())
      .map(([name, hours]) => ({ name, hours: Math.round(hours * 100) / 100 }))
      .sort((a, b) => b.hours - a.hours);
  }, [timeEntries]);

  const hoursByEmployee = useMemo(() => {
    if (!timeEntries) return [];
    const map = new Map<string, { total: number; overtime: number }>();
    for (const entry of timeEntries) {
      const name = entry.user_profiles
        ? `${entry.user_profiles.first_name} ${entry.user_profiles.last_name}`
        : 'Unknown';
      const current = map.get(name) || { total: 0, overtime: 0 };
      current.total += entry.hours || 0;
      current.overtime += entry.overtime_hours || 0;
      map.set(name, current);
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        totalHours: Math.round(data.total * 100) / 100,
        overtimeHours: Math.round(data.overtime * 100) / 100,
      }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [timeEntries]);

  const budgetedVsActual = useMemo(() => {
    if (!timeEntries || !projects) return [];
    const actualMap = new Map<string, number>();
    for (const entry of timeEntries) {
      if (entry.project_id) {
        actualMap.set(
          entry.project_id,
          (actualMap.get(entry.project_id) || 0) + (entry.hours || 0)
        );
      }
    }
    return projects
      .filter((p) => p.budget_hours || actualMap.has(p.id))
      .map((project) => ({
        name: project.name,
        budgetHours: project.budget_hours || 0,
        actualHours: Math.round((actualMap.get(project.id) || 0) * 100) / 100,
      }));
  }, [timeEntries, projects]);

  const handleExportCSV = () => {
    toast({
      title: 'Export Started',
      description: 'CSV export will be available shortly.',
    });
  };

  const handleExportPDF = () => {
    toast({
      title: 'Export Started',
      description: 'PDF report will be available shortly.',
    });
  };

  if (entriesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <Label htmlFor="report-start-date">Start Date</Label>
              <Input
                id="report-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 w-full">
              <Label htmlFor="report-end-date">End Date</Label>
              <Input
                id="report-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                CSV
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hours by Project Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Hours by Project</CardTitle>
          <CardDescription>
            Total hours tracked per project in the selected date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hoursByProject.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No time entries found for the selected period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={hoursByProject} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => [`${value} hrs`, 'Hours']} />
                <Legend />
                <Bar dataKey="hours" fill="#3b82f6" name="Hours" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Hours by Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hours by Employee</CardTitle>
          <CardDescription>
            Breakdown of total and overtime hours per team member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hoursByEmployee.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No employee data available for the selected period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Employee</th>
                    <th className="text-right py-3 px-4 font-medium">Total Hours</th>
                    <th className="text-right py-3 px-4 font-medium">Overtime Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {hoursByEmployee.map((employee) => (
                    <tr key={employee.name} className="border-b last:border-b-0">
                      <td className="py-3 px-4">{employee.name}</td>
                      <td className="py-3 px-4 text-right">{employee.totalHours}</td>
                      <td className="py-3 px-4 text-right">
                        {employee.overtimeHours > 0 ? (
                          <span className="text-red-600 font-medium">
                            {employee.overtimeHours}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budgeted vs Actual */}
      <Card>
        <CardHeader>
          <CardTitle>Budgeted vs Actual Hours</CardTitle>
          <CardDescription>
            Compare estimated budget hours against actual tracked hours per project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {budgetedVsActual.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No projects with budget data found.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgetedVsActual.map((project) => {
                const overBudget = project.budgetHours > 0 && project.actualHours > project.budgetHours;
                const percentage =
                  project.budgetHours > 0
                    ? Math.round((project.actualHours / project.budgetHours) * 100)
                    : 0;
                return (
                  <Card key={project.name} className={overBudget ? 'border-red-300' : ''}>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2 truncate" title={project.name}>
                        {project.name}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Budget</span>
                          <span>{project.budgetHours} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actual</span>
                          <span className={overBudget ? 'text-red-600 font-medium' : ''}>
                            {project.actualHours} hrs
                          </span>
                        </div>
                        {project.budgetHours > 0 && (
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-muted-foreground">Usage</span>
                            <Badge
                              variant={overBudget ? 'destructive' : 'secondary'}
                            >
                              {percentage}%
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { TimeTrackingReports };
