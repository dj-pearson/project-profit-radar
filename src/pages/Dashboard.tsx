import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const { user, userProfile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    // If user doesn't have a company, redirect to setup
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
  }, [user, userProfile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'root_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'project_manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-construction-blue">Build Desk</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {userProfile?.first_name || user.email}
              </span>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-lg">
                  {userProfile?.first_name && userProfile?.last_name 
                    ? `${userProfile.first_name} ${userProfile.last_name}`
                    : 'Not set'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <Badge variant={getRoleBadgeVariant(userProfile?.role || '')}>
                  {userProfile?.role?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {userProfile?.role === 'root_admin' && (
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Platform statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold text-construction-blue">0</p>
                    <p className="text-sm text-muted-foreground">Total Companies</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-construction-orange">0</p>
                    <p className="text-sm text-muted-foreground">Active Projects</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">0</p>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {userProfile?.role === 'root_admin' && (
                <>
                  <Button variant="outline" className="w-full justify-start">
                    Manage Companies
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    View System Logs
                  </Button>
                </>
              )}
              {(userProfile?.role === 'admin' || userProfile?.role === 'project_manager') && (
                <>
                  <Button variant="outline" className="w-full justify-start">
                    Create Project
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Manage Team
                  </Button>
                </>
              )}
              <Button variant="outline" className="w-full justify-start">
                View Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        {userProfile?.role === 'root_admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Root Admin Panel</CardTitle>
              <CardDescription>System-wide management and oversight</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button variant="construction" className="h-24 flex-col">
                  <span className="text-lg font-bold">Companies</span>
                  <span className="text-sm">Manage Organizations</span>
                </Button>
                <Button variant="construction" className="h-24 flex-col">
                  <span className="text-lg font-bold">Users</span>
                  <span className="text-sm">User Management</span>
                </Button>
                <Button variant="construction" className="h-24 flex-col">
                  <span className="text-lg font-bold">Billing</span>
                  <span className="text-sm">Subscription Overview</span>
                </Button>
                <Button variant="construction" className="h-24 flex-col">
                  <span className="text-lg font-bold">Analytics</span>
                  <span className="text-sm">Platform Metrics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;