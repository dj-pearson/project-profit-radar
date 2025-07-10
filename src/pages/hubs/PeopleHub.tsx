import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { dashboardAreas } from '@/components/navigation/NavigationConfig';

const PeopleHub = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const peopleArea = dashboardAreas.find(area => area.id === 'people');
  
  if (!peopleArea) {
    return <div>Area not found</div>;
  }

  const filterItemsByRole = (items: any[]) => {
    return items.filter(item => {
      return userProfile?.role === 'root_admin' || item.roles.includes(userProfile?.role || '');
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-3">
                <peopleArea.icon className="h-6 w-6 text-construction-blue" />
                <div>
                  <h1 className="text-xl font-semibold">{peopleArea.title}</h1>
                  <p className="text-sm text-muted-foreground">{peopleArea.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                  <p className="text-2xl font-bold">28</p>
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
                  <p className="text-2xl font-bold">42</p>
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
                  <p className="text-2xl font-bold">156</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Hours This Week</p>
                  <p className="text-2xl font-bold">1,124</p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <peopleArea.icon className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
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
                    <Card key={item.url} className="hover:shadow-md transition-shadow cursor-pointer group">
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
                      <CardContent 
                        className="pt-0 cursor-pointer"
                        onClick={() => navigate(item.url)}
                      >
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
      </div>
    </div>
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