/**
 * User Context Panel
 * Displays comprehensive user/company context for support tickets
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Building2,
  AlertTriangle,
  CheckCircle,
  Zap,
  FileText,
  Activity,
  Eye,
  Bug,
} from 'lucide-react';
import { UserActivityTimeline } from './UserActivityTimeline';
import { DebugConsole } from './DebugConsole';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TicketContext {
  user_id: string;
  company_id: string;
  account_health_score: number;
  last_login: string | null;
  recent_actions: any[];
  integration_status: any;
  support_history_summary: any;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company_id: string;
  last_login: string | null;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
}

interface UserContextPanelProps {
  ticketId: string;
  customerEmail: string;
}

export const UserContextPanel: React.FC<UserContextPanelProps> = ({
  ticketId,
  customerEmail,
}) => {
  const [context, setContext] = useState<TicketContext | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showDebugConsole, setShowDebugConsole] = useState(false);

  useEffect(() => {
    loadContext();
  }, [ticketId, customerEmail]);

  const loadContext = async () => {
    try {
      setLoading(true);

      // Get ticket context
      const { data: contextData, error: contextError } = await supabase
        .from('support_ticket_context')
        .select('*')
        .eq('ticket_id', ticketId)
        .single();

      if (contextError && contextError.code !== 'PGRST116') {
        console.error('Error loading context:', contextError);
      }

      if (contextData) {
        setContext({
          ...contextData,
          recent_actions: Array.isArray(contextData.recent_actions) ? contextData.recent_actions : []
        });
      }

      // Get user profile
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', customerEmail)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error loading user:', userError);
      }

      setUser(userData);

      // Get company
      if (userData?.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userData.company_id)
          .single();

        if (companyError && companyError.code !== 'PGRST116') {
          console.error('Error loading company:', companyError);
        }

        setCompany(companyData);
      }
    } catch (error) {
      console.error('Error in loadContext:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthScoreBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-500">Healthy ({score})</Badge>;
    if (score >= 50) return <Badge variant="secondary">Fair ({score})</Badge>;
    if (score >= 30) return <Badge className="bg-orange-500">At Risk ({score})</Badge>;
    return <Badge variant="destructive">Critical ({score})</Badge>;
  };

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return <Badge className="bg-purple-500">Enterprise</Badge>;
      case 'professional':
        return <Badge className="bg-blue-500">Professional</Badge>;
      case 'starter':
        return <Badge variant="outline">Starter</Badge>;
      default:
        return <Badge variant="outline">{tier}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            User Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>User not found in system</p>
            <p className="text-sm mt-1">Email: {customerEmail}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            User Context
          </CardTitle>
          <CardDescription>{customerEmail}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">
                {user.first_name} {user.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="outline">{user.role.replace('_', ' ').toUpperCase()}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Login</p>
              <p className="text-sm">{formatDate(user.last_login)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="text-sm">
                {Math.floor(
                  (new Date().getTime() - new Date(user.created_at).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                days
              </p>
            </div>
          </div>

          <Separator />

          {/* Company Info */}
          {company && (
            <div>
              <div className="flex items-center mb-3">
                <Building2 className="h-4 w-4 mr-2" />
                <h3 className="font-medium">Company: {company.name}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  {getTierBadge(company.subscription_tier)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getSubscriptionBadge(company.subscription_status)}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Account Health */}
          {context && context.account_health_score !== null && (
            <div>
              <div className="flex items-center mb-3">
                <Activity className="h-4 w-4 mr-2" />
                <h3 className="font-medium">Account Health</h3>
              </div>
              {getHealthScoreBadge(context.account_health_score)}
              {context.account_health_score < 50 && (
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                  <AlertTriangle className="h-4 w-4 inline mr-1 text-orange-600" />
                  <span className="text-orange-800">At-risk account - handle with care</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Integration Status */}
          {context?.integration_status && (
            <div>
              <div className="flex items-center mb-3">
                <Zap className="h-4 w-4 mr-2" />
                <h3 className="font-medium">Integrations</h3>
              </div>
              <div className="space-y-2">
                {Object.entries(context.integration_status).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{key}</span>
                    {value ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not configured</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Support History */}
          {context?.support_history_summary && (
            <div>
              <div className="flex items-center mb-3">
                <FileText className="h-4 w-4 mr-2" />
                <h3 className="font-medium">Support History</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Tickets</p>
                  <p className="font-medium">{context.support_history_summary.totalTickets || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Open Tickets</p>
                  <p className="font-medium">{context.support_history_summary.openTickets || 0}</p>
                </div>
                {context.support_history_summary.lastTicketDate && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Last Ticket</p>
                    <p className="text-sm">{formatDate(context.support_history_summary.lastTicketDate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View Timeline & Debug Console Buttons */}
          <div className="pt-4 space-y-2">
            <Dialog open={showTimeline} onOpenChange={setShowTimeline}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  View Activity Timeline
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    User Activity Timeline - {user.first_name} {user.last_name}
                  </DialogTitle>
                </DialogHeader>
                <UserActivityTimeline userId={user.id} companyId={user.company_id} />
              </DialogContent>
            </Dialog>

            <Button
              variant={showDebugConsole ? "default" : "outline"}
              className="w-full"
              onClick={() => setShowDebugConsole(!showDebugConsole)}
            >
              <Bug className="h-4 w-4 mr-2" />
              {showDebugConsole ? 'Hide Debug Console' : 'Show Debug Console'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Actions Quick View */}
      {context?.recent_actions && context.recent_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Activity className="h-4 w-4 mr-2" />
              Recent Actions (Last 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {context.recent_actions.slice(0, 5).map((action: any, index: number) => (
                <div key={index} className="text-xs p-2 bg-muted rounded">
                  <span className="font-medium">{action.action_type}</span>
                  {action.action_details?.page && (
                    <span className="text-muted-foreground ml-2">
                      - {action.action_details.page}
                    </span>
                  )}
                  <span className="text-muted-foreground ml-2">
                    {formatDate(action.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Console */}
      {showDebugConsole && (
        <DebugConsole
          userId={user.id}
          companyId={user.company_id}
          isFloating={false}
        />
      )}
    </div>
  );
};
