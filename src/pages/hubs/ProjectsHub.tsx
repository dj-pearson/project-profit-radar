import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Crown } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { HubNavigationSection } from '@/components/hub/HubNavigationSection';
import { hierarchicalNavigation } from '@/components/navigation/HierarchicalNavigationConfig';
import UpgradePrompt from '@/components/subscription/UpgradePrompt';

const ProjectsHub = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { checkLimit, getUpgradeRequirement, subscriptionData, usage, refreshUsage } = useSubscription();
  const [metrics, setMetrics] = useState({
    activeProjects: 0,
    changeOrders: 0,
    dailyReports: 0,
    totalProjects: 0
  });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

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
    refreshUsage(); // Also refresh subscription usage when metrics change
  }, [userProfile?.company_id, refreshUsage]);

  // Handle create project with limit checking
  const handleCreateProject = () => {
    const limitCheck = checkLimit('projects', 1);

    if (!limitCheck.canAdd) {
      setShowUpgradePrompt(true);
      return;
    }

    navigate('/create-project');
  };

  // Get project sections from hierarchical navigation config
  const projectsArea = hierarchicalNavigation.find(area => area.id === 'projects');
  const projectSections = projectsArea?.sections || [];

  return (
    <DashboardLayout title="Projects Hub">
      <div>
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => navigate('/projects')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/projects'); } }}
            role="button"
            tabIndex={0}
            aria-label={`Active Projects: ${metrics.activeProjects}. Click to view projects.`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold">{metrics.activeProjects}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors">
                  <ArrowRight className="h-4 w-4 text-blue-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => navigate('/projects')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/projects'); } }}
            role="button"
            tabIndex={0}
            aria-label={`Total Projects: ${metrics.totalProjects}. Click to view all projects.`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                  <p className="text-2xl font-bold">{metrics.totalProjects}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors">
                  <ArrowRight className="h-4 w-4 text-green-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => navigate('/change-orders')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/change-orders'); } }}
            role="button"
            tabIndex={0}
            aria-label={`Change Orders: ${metrics.changeOrders}. Click to view change orders.`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Change Orders</p>
                  <p className="text-2xl font-bold">{metrics.changeOrders}</p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center hover:bg-yellow-200 transition-colors">
                  <ArrowRight className="h-4 w-4 text-yellow-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => navigate('/daily-reports')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/daily-reports'); } }}
            role="button"
            tabIndex={0}
            aria-label={`Daily Reports: ${metrics.dailyReports}. Click to view daily reports.`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Daily Reports</p>
                  <p className="text-2xl font-bold">{metrics.dailyReports}</p>
                </div>
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors">
                  <ArrowRight className="h-4 w-4 text-red-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleCreateProject}>
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
            <HubNavigationSection
              key={section.id}
              label={section.label}
              items={section.items}
            />
          ))}
        </div>

        {/* Subscription Limit Indicator */}
        {subscriptionData && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-construction-orange" />
                  <span className="text-sm font-medium">Project Limit</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {usage.projects} / {checkLimit('projects').limit === -1 ? '∞' : checkLimit('projects').limit}
                  </span>
                  <Badge variant={subscriptionData.subscription_tier === 'enterprise' || subscriptionData.is_complimentary ? 'default' : 'secondary'}>
                    {subscriptionData.is_complimentary ? 'Complimentary' : subscriptionData.subscription_tier?.charAt(0).toUpperCase() + subscriptionData.subscription_tier?.slice(1) || 'Free'}
                  </Badge>
                </div>
              </div>
              {checkLimit('projects').limit !== -1 && usage.projects >= checkLimit('projects').limit * 0.8 && (
                <p className="text-xs text-muted-foreground mt-2">
                  You're approaching your project limit. Consider upgrading to add more projects.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upgrade Prompt */}
        <UpgradePrompt
          isOpen={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          currentTier={subscriptionData?.subscription_tier || 'starter'}
          requiredTier={getUpgradeRequirement('projects')}
          limitType="projects"
          currentUsage={usage.projects}
          currentLimit={checkLimit('projects').limit}
        />
      </div>
    </DashboardLayout>
  );
};

export default ProjectsHub;
