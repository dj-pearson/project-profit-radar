import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { JobCostingDashboard } from '@/components/job-costing/JobCostingDashboard';
import { BudgetManager } from '@/components/job-costing/BudgetManager';
import { LaborTracking } from '@/components/job-costing/LaborTracking';
import { CostAnalysis } from '@/components/job-costing/CostAnalysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  company_id: string;
}

const JobCosting: React.FC = () => {
  const { projectId } = useParams();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(projectId || '');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (userProfile) {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('id, name, company_id')
          .eq('company_id', userProfile.company_id)
          .order('name');

        if (error) throw error;
        setProjects(projects || []);
        
        if (!selectedProject && projects && projects.length > 0) {
          setSelectedProject(projects[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Job costing report export is being prepared...",
    });
  };

  if (loading) {
    return <DashboardLayout title="Job Costing">
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    </DashboardLayout>;
  }

  return (
    <DashboardLayout title="Job Costing">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Real-Time Job Costing</CardTitle>
              <div className="flex items-center gap-4">
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {selectedProject && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
              <TabsTrigger value="labor">Labor Tracking</TabsTrigger>
              <TabsTrigger value="analysis">Cost Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <JobCostingDashboard projectId={selectedProject} />
            </TabsContent>

            <TabsContent value="budget" className="space-y-6">
              <BudgetManager projectId={selectedProject} />
            </TabsContent>

            <TabsContent value="labor" className="space-y-6">
              <LaborTracking projectId={selectedProject} />
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              <CostAnalysis projectId={selectedProject} />
            </TabsContent>
          </Tabs>
        )}

        {!selectedProject && projects.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
                <p className="text-muted-foreground">Create a project to start tracking job costs.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default JobCosting;