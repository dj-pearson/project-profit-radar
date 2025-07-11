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

const PeopleHub = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [metrics, setMetrics] = useState({
    teamMembers: 0,
    activeLeads: 0,
    totalContacts: 0,
    crewAssignments: 0
  });

  const peopleArea = dashboardAreas.find(area => area.id === 'people');
  
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!userProfile?.company_id) return;

      try {
        // Fetch team members
        const { count: teamCount } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id);

        // Fetch active leads
        const { count: leadsCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id)
          .eq('contact_type', 'lead')
          .eq('relationship_status', 'active');

        // Fetch total contacts
        const { count: contactsCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id);

        // Fetch crew assignments for this week
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        const { count: crewCount } = await supabase
          .from('crew_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id)
          .gte('assigned_date', startOfWeek.toISOString().split('T')[0])
          .lte('assigned_date', endOfWeek.toISOString().split('T')[0]);

        setMetrics({
          teamMembers: teamCount || 0,
          activeLeads: leadsCount || 0,
          totalContacts: contactsCount || 0,
          crewAssignments: crewCount || 0
        });
      } catch (error) {
        console.error('Error fetching people metrics:', error);
      }
    };

    fetchMetrics();
  }, [userProfile?.company_id]);
  
  if (!peopleArea) {
    return <div>Area not found</div>;
  }

  const filterItemsByRole = (items: any[]) => {
    return items.filter(item => {
      return userProfile?.role === 'root_admin' || item.roles.includes(userProfile?.role || '');
    });
  };

  return (
    <DashboardLayout title={peopleArea.title}>
      <div>
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                  <p className="text-2xl font-bold">{metrics.teamMembers}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <peopleArea.icon className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Leads</p>
                  <p className="text-2xl font-bold">{metrics.activeLeads}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <peopleArea.icon className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                  <p className="text-2xl font-bold">{metrics.totalContacts}</p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <peopleArea.icon className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Crew Assignments</p>
                  <p className="text-2xl font-bold">{metrics.crewAssignments}</p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <peopleArea.icon className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/team')}>
              Add Team Member
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm/leads')}>
              Add Lead
            </Button>
            <Button variant="outline" onClick={() => navigate('/crm/contacts')}>
              Add Contact
            </Button>
            <Button variant="outline" onClick={() => navigate('/time-tracking')}>
              Clock In/Out
            </Button>
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="space-y-8">
          {peopleArea.subcategories.map((category) => {
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
    'Team Management': 'Manage team members and roles',
    'Crew Scheduling': 'Schedule crews and assign work',
    'Time Tracking': 'Track work hours and attendance',
    'CRM Dashboard': 'Customer relationship overview',
    'Leads': 'Manage sales leads and prospects',
    'Contacts': 'Manage customer and vendor contacts',
    'Opportunities': 'Track sales opportunities and pipeline',
    'Email Marketing': 'Send marketing emails and campaigns',
    'Support': 'Customer support and help desk'
  };
  
  return descriptions[title] || 'Access this feature';
};

export default PeopleHub;