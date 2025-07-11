import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { dashboardAreas } from '@/components/navigation/NavigationConfig';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';

const OperationsHub = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [metrics, setMetrics] = useState({
    safetyIncidents: 0,
    activePermits: 0,
    bonds: 0,
    serviceRequests: 0
  });

  const operationsArea = dashboardAreas.find(area => area.id === 'operations');
  
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!userProfile?.company_id) return;

      try {
        // Fetch active environmental permits
        const { count: permitsCount } = await supabase
          .from('environmental_permits')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id)
          .eq('status', 'active');

        // Fetch active bonds
        const { count: bondsCount } = await supabase
          .from('bonds')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id)
          .eq('status', 'active');

        // Fetch service requests
        const { count: serviceRequestsCount } = await supabase
          .from('customer_service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'submitted');

        setMetrics({
          safetyIncidents: 0, // No safety incidents table yet
          activePermits: permitsCount || 0,
          bonds: bondsCount || 0,
          serviceRequests: serviceRequestsCount || 0
        });
      } catch (error) {
        console.error('Error fetching operations metrics:', error);
      }
    };

    fetchMetrics();
  }, [userProfile?.company_id]);
  
  if (!operationsArea) {
    return <div>Area not found</div>;
  }

  const filterItemsByRole = (items: any[]) => {
    return items.filter(item => {
      return userProfile?.role === 'root_admin' || item.roles.includes(userProfile?.role || '');
    });
  };

  return (
    <DashboardLayout title={operationsArea.title}>
      <div>
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Safety Incidents</p>
                  <p className="text-2xl font-bold">{metrics.safetyIncidents}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <operationsArea.icon className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Permits</p>
                  <p className="text-2xl font-bold">{metrics.activePermits}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <operationsArea.icon className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Bonds</p>
                  <p className="text-2xl font-bold">{metrics.bonds}</p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <operationsArea.icon className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Service Requests</p>
                  <p className="text-2xl font-bold">{metrics.serviceRequests}</p>
                </div>
                <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <operationsArea.icon className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/safety')}>
              Report Safety Issue
            </Button>
            <Button variant="outline" onClick={() => navigate('/permit-management')}>
              Apply for Permit
            </Button>
            <Button variant="outline" onClick={() => navigate('/equipment-management')}>
              Check Out Equipment
            </Button>
            <Button variant="outline" onClick={() => navigate('/workflows')}>
              Create Workflow
            </Button>
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="space-y-8">
          {operationsArea.subcategories.map((category) => {
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
      </div>
    </DashboardLayout>
  );
};

// Helper function to get descriptions for items
const getItemDescription = (title: string): string => {
  const descriptions: { [key: string]: string } = {
    'Safety Management': 'Track safety incidents and compliance',
    'Compliance Audit': 'Perform compliance audits and assessments',
    'GDPR Compliance': 'Manage data privacy and GDPR compliance',
    'Permit Management': 'Apply for and track permits',
    'Environmental Permits': 'Environmental compliance and permits',
    'Bond & Insurance': 'Manage bonds and insurance policies',
    'Warranty Management': 'Track warranties and service agreements',
    'Public Procurement': 'Manage public sector contracts',
    'Service Dispatch': 'Dispatch field service teams',
    'Calendar Integration': 'Sync with external calendars',
    'Equipment Management': 'Track and maintain equipment',
    'Automated Workflows': 'Create automated business processes',
    'Knowledge Base': 'Access documentation and guides'
  };
  
  return descriptions[title] || 'Access this feature';
};

export default OperationsHub;