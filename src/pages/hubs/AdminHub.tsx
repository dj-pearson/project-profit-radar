import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { dashboardAreas, NavigationItem } from '@/components/navigation/NavigationConfig';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { CreateMissingContent } from '@/components/admin/CreateMissingContent';

const AdminHub = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [metrics, setMetrics] = useState({
    totalCompanies: 0,
    activeUsers: 0,
    auditLogs: 0,
    blogPosts: 0
  });

  const adminArea = dashboardAreas.find(area => area.id === 'admin');
  
  useEffect(() => {
    const fetchMetrics = async () => {
      if (userProfile?.role !== 'root_admin') return;

      try {
        // Fetch total companies
        const { count: companiesCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });

        // Fetch active users
        const { count: usersCount } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch recent audit logs
        const { count: auditCount } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // Fetch blog posts
        const { count: blogCount } = await supabase
          .from('blog_posts')
          .select('*', { count: 'exact', head: true });

        setMetrics({
          totalCompanies: companiesCount || 0,
          activeUsers: usersCount || 0,
          auditLogs: auditCount || 0,
          blogPosts: blogCount || 0
        });
      } catch (error) {
        console.error('Error fetching admin metrics:', error);
      }
    };

    fetchMetrics();
  }, [userProfile?.role]);
  
  if (!adminArea) {
    return <div>Area not found</div>;
  }

  // Check if user has admin access
  if (!['admin', 'root_admin'].includes(userProfile?.role || '')) {
    return (
      <DashboardLayout title="Access Denied">
        <div className="flex items-center justify-center min-h-96">
          <Card className="max-w-md">
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Access Denied</h3>
              <p className="text-muted-foreground mb-4">
                You don't have permission to access administrative features.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const filterItemsByRole = (items: NavigationItem[]) => {
    return items.filter(item => {
      return userProfile?.role === 'root_admin' || item.roles.includes(userProfile?.role || '');
    });
  };

  return (
    <DashboardLayout title={adminArea.title}>
      <div>
        {/* Admin Stats (only for root_admin) */}
        {userProfile?.role === 'root_admin' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Companies</p>
                    <p className="text-2xl font-bold">{metrics.totalCompanies}</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <adminArea.icon className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{metrics.activeUsers}</p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <adminArea.icon className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Audit Logs (30d)</p>
                    <p className="text-2xl font-bold">{metrics.auditLogs}</p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <adminArea.icon className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Blog Posts</p>
                    <p className="text-2xl font-bold">{metrics.blogPosts}</p>
                  </div>
                  <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <adminArea.icon className="h-4 w-4 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {userProfile?.role === 'root_admin' && (
              <>
                <Button onClick={() => navigate('/admin/companies')}>
                  Manage Companies
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin/users')}>
                  Manage Users
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin/analytics')}>
                  View Analytics
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin/seo-management')}>
                  SEO Management ✨
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin/social-media')}>
                  Social Media
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin/funnels')}>
                  Lead Funnels
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => navigate('/admin/settings')}>
              System Settings
            </Button>
          </div>
        </div>

        {/* Content Management */}
        {userProfile?.role === 'root_admin' && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Content Management</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <CreateMissingContent />
            </div>
          </div>
        )}

        {/* Navigation Categories */}
        <div className="space-y-8">
          {adminArea.subcategories.map((category) => {
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
                            <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                              <item.icon className="h-5 w-5 text-red-600" />
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
    'Companies': 'Manage all platform companies and accounts',
    'Users': 'Manage platform users and permissions',
    'Billing': 'Monitor billing and subscription status',
    'Complimentary Subscriptions': 'Manage free and trial accounts',
    'Promotions': 'Create and manage promotional campaigns',
    'Analytics': 'Platform usage and performance analytics',
    'System Settings': 'Configure platform-wide settings',
    'Security Monitoring': 'Monitor security events and threats',
    'Rate Limiting': 'Configure API rate limits and quotas',
    'Blog Manager': 'Manage platform blog and content',
    'Social Media Manager': 'Manage social media accounts and posts',
    'SEO Manager': 'Manage SEO settings and optimization',
    'SEO Analytics': 'Comprehensive SEO traffic analysis and insights',
    'Funnels': 'Create and manage automated lead nurture sequences'
  };
  
  return descriptions[title] || 'Access this feature';
};

export default AdminHub;