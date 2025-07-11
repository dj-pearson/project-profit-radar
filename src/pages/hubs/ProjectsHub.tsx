import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { dashboardAreas } from '@/components/navigation/NavigationConfig';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const ProjectsHub = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const projectsArea = dashboardAreas.find(area => area.id === 'projects');
  
  if (!projectsArea) {
    return <div>Area not found</div>;
  }

  const filterItemsByRole = (items: any[]) => {
    return items.filter(item => {
      return userProfile?.role === 'root_admin' || item.roles.includes(userProfile?.role || '');
    });
  };

  return (
    <DashboardLayout title={projectsArea.title}>
      <div>
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <projectsArea.icon className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Open RFIs</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <projectsArea.icon className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Submittals</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <projectsArea.icon className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Punch List Items</p>
                  <p className="text-2xl font-bold">23</p>
                </div>
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                  <projectsArea.icon className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Categories */}
        <div className="space-y-8">
          {projectsArea.subcategories.map((category) => {
            const visibleItems = filterItemsByRole(category.items);
            
            if (visibleItems.length === 0) return null;
            
            return (
              <div key={category.label}>
                <h2 className="text-lg font-semibold mb-4">{category.label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleItems.map((item) => (
                    <Card 
                      key={item.url} 
                      className="hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => navigate(item.url)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-construction-blue/10 rounded-lg flex items-center justify-center">
                              <item.icon className="h-5 w-5 text-construction-blue" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{item.title}</CardTitle>
                              {item.badge && (
                                <Badge variant="destructive" className="text-xs mt-1">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <CardDescription>
                          {getItemDescription(item.title)}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
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
      </div>
    </DashboardLayout>
  );
};

// Helper function to get descriptions for items
const getItemDescription = (title: string): string => {
  const descriptions: { [key: string]: string } = {
    'All Projects': 'View and manage all construction projects',
    'Create Project': 'Start a new construction project',
    'Job Costing': 'Track project costs and budgets',
    'Daily Reports': 'Daily progress and activity reports',
    'RFIs': 'Request for Information management',
    'Submittals': 'Submit and track approval workflows',
    'Change Orders': 'Manage project change requests',
    'Punch List': 'Track quality issues and completion items',
    'Document Management': 'Store and organize project documents',
    'Materials': 'Track material usage and inventory',
    'Equipment': 'Manage equipment tracking and usage'
  };
  
  return descriptions[title] || 'Access this feature';
};

export default ProjectsHub;