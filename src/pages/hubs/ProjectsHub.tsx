import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';

const ProjectsHub = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [metrics, setMetrics] = useState({
    activeProjects: 0,
    changeOrders: 0,
    dailyReports: 0,
    totalProjects: 0
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!userProfile?.company_id) return;

      try {
        // Fetch active projects
        const { count: activeProjectsCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id)
          .eq('status', 'active');

        // Fetch change orders
        const { count: changeOrdersCount } = await supabase
          .from('change_orders')
          .select('*, projects!inner(*)', { count: 'exact', head: true })
          .eq('projects.company_id', userProfile.company_id);

        // Fetch daily reports
        const { count: dailyReportsCount } = await supabase
          .from('daily_reports')
          .select('*, projects!inner(*)', { count: 'exact', head: true })
          .eq('projects.company_id', userProfile.company_id);

        // Fetch total projects
        const { count: totalProjectsCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id);

        setMetrics({
          activeProjects: activeProjectsCount || 0,
          changeOrders: changeOrdersCount || 0,
          dailyReports: dailyReportsCount || 0,
          totalProjects: totalProjectsCount || 0
        });
      } catch (error) {
        console.error('Error fetching project metrics:', error);
      }
    };

    fetchMetrics();
  }, [userProfile?.company_id]);

  const projectSections = [
    {
      label: "Project Management",
      items: [
        { title: "All Projects", url: "/projects", description: "View and manage all construction projects" },
        { title: "Create Project", url: "/create-project", description: "Start a new construction project" },
        { title: "Job Costing", url: "/job-costing", description: "Track project costs and budgets" },
        { title: "Daily Reports", url: "/daily-reports", description: "Daily progress and activity reports" }
      ]
    },
    {
      label: "Project Communication",
      items: [
        { title: "RFIs", url: "/rfis", description: "Request for Information management" },
        { title: "Submittals", url: "/submittals", description: "Submit and track approval workflows" },
        { title: "Change Orders", url: "/change-orders", description: "Manage project change requests" },
        { title: "Punch List", url: "/punch-list", description: "Track quality issues and completion items" }
      ]
    },
    {
      label: "Project Resources", 
      items: [
        { title: "Document Management", url: "/documents", description: "Store and organize project documents" },
        { title: "Materials", url: "/materials", description: "Track material usage and inventory" },
        { title: "Equipment", url: "/equipment", description: "Manage equipment tracking and usage" }
      ]
    }
  ];

  return (
    <DashboardLayout title="Projects Hub">
      <div>
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold">{metrics.activeProjects}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                  <p className="text-2xl font-bold">{metrics.totalProjects}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Change Orders</p>
                  <p className="text-2xl font-bold">{metrics.changeOrders}</p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Daily Reports</p>
                  <p className="text-2xl font-bold">{metrics.dailyReports}</p>
                </div>
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/create-project')}>
              Create New Project
            </Button>
            <Button variant="outline" onClick={() => navigate('/rfis')}>
              New RFI
            </Button>
            <Button variant="outline" onClick={() => navigate('/submittals')}>
              New Submittal
            </Button>
            <Button variant="outline" onClick={() => navigate('/punch-list')}>
              Add Punch Item
            </Button>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-8">
          {projectSections.map((section) => (
            <div key={section.label}>
              <h2 className="text-lg font-semibold mb-4">{section.label}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.items.map((item) => (
                  <Card 
                    key={item.url} 
                    className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => navigate(item.url)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription>{item.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProjectsHub;
