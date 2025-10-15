import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, GanttChartIcon, ListIcon, Settings } from 'lucide-react';
import { ProjectGanttChart } from '@/components/schedule/ProjectGanttChart';
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';
import { ProjectTimeline } from '@/components/schedule/ProjectTimeline';
import { ScheduleOverview } from '@/components/schedule/ScheduleOverview';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';

interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  budget: number;
  completion_percentage: number;
  project_manager: string;
  client_name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

const ScheduleManagement = () => {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchProjects();
  }, [userProfile?.company_id, selectedYear]);

  const fetchProjects = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      const startDate = new Date(selectedYear - 1, 0, 1).toISOString();
      const endDate = new Date(selectedYear + 1, 11, 31).toISOString();

      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          start_date,
          end_date,
          status,
          budget,
          completion_percentage,
          client_name
        `)
        .eq('company_id', userProfile.company_id)
        .gte('start_date', startDate)
        .lte('end_date', endDate)
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Add priority based on status and dates
      const enhancedProjects = data?.map(project => ({
        id: project.id,
        name: project.name,
        start_date: project.start_date,
        end_date: project.end_date,
        status: project.status,
        budget: project.budget,
        completion_percentage: project.completion_percentage,
        project_manager: 'TBD',
        client_name: project.client_name,
        priority: getPriority(project) as 'low' | 'medium' | 'high' | 'critical'
      })) || [];

      setProjects(enhancedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriority = (project: any): string => {
    const now = new Date();
    const endDate = new Date(project.end_date);
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (project.status === 'on_hold' || project.status === 'completed') return 'low';
    if (daysUntilEnd < 7) return 'critical';
    if (daysUntilEnd < 30) return 'high';
    if (daysUntilEnd < 90) return 'medium';
    return 'low';
  };

  const handleDateRangeChange = (startDate: Date, endDate: Date, projectId: string) => {
    // Update project dates in database
    updateProjectDates(projectId, startDate, endDate);
  };

  const updateProjectDates = async (projectId: string, startDate: Date, endDate: Date) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;

      // Refresh projects
      fetchProjects();
    } catch (error) {
      console.error('Error updating project dates:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Schedule Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.PROJECT_VIEWERS}>
      <DashboardLayout title="Schedule Management">
        <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 1 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
            <Badge variant="outline">
              {projects.length} Projects
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button size="sm" onClick={() => fetchProjects()}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <ListIcon className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="gantt" className="flex items-center gap-2">
              <GanttChartIcon className="h-4 w-4" />
              Gantt Chart
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ScheduleOverview 
              projects={projects}
              onProjectUpdate={fetchProjects}
              selectedYear={selectedYear}
            />
          </TabsContent>

          <TabsContent value="gantt" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Gantt Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectGanttChart
                  projects={projects}
                  onDateRangeChange={handleDateRangeChange}
                  selectedYear={selectedYear}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectTimeline
                  projects={projects}
                  onDateRangeChange={handleDateRangeChange}
                  selectedYear={selectedYear}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <ScheduleCalendar
                  projects={projects}
                  onDateRangeChange={handleDateRangeChange}
                  selectedYear={selectedYear}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </RoleGuard>
  );
};

export default ScheduleManagement;