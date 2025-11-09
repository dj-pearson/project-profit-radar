/**
 * User Activity Timeline
 * Shows chronological user actions for debugging and support
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  Mouse,
  Eye,
  Zap,
  AlertCircle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

interface ActivityEvent {
  id: string;
  action_type: string;
  action_details: any;
  error_message?: string;
  error_details?: any;
  url?: string;
  duration_ms?: number;
  timestamp: string;
}

interface UserActivityTimelineProps {
  userId: string;
  companyId?: string;
  limit?: number;
  showFilters?: boolean;
}

export const UserActivityTimeline: React.FC<UserActivityTimelineProps> = ({
  userId,
  companyId,
  limit = 50,
  showFilters = true,
}) => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadActivities();
  }, [userId, filterType]);

  const loadActivities = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('user_activity_timeline')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (filterType !== 'all') {
        query = query.eq('action_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'page_view':
        return <Eye className="h-4 w-4" />;
      case 'click':
        return <Mouse className="h-4 w-4" />;
      case 'feature_used':
        return <Zap className="h-4 w-4" />;
      case 'api_call':
        return <Activity className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'error':
        return 'destructive';
      case 'feature_used':
        return 'default';
      case 'api_call':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActionDescription = (activity: ActivityEvent) => {
    const details = activity.action_details || {};

    switch (activity.action_type) {
      case 'page_view':
        return `Viewed ${details.page || 'page'}`;
      case 'feature_used':
        return `Used ${details.feature || 'feature'}`;
      case 'api_call':
        return `API: ${details.endpoint || activity.url}`;
      case 'error':
        return activity.error_message || 'Error occurred';
      case 'click':
        return `Clicked ${details.element || 'element'}`;
      default:
        return activity.action_type.replace(/_/g, ' ');
    }
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Activity Timeline
            </CardTitle>
            <CardDescription>
              Chronological log of user actions (last {activities.length} events)
            </CardDescription>
          </div>
          {showFilters && (
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="page_view">Page Views</SelectItem>
                <SelectItem value="feature_used">Feature Usage</SelectItem>
                <SelectItem value="api_call">API Calls</SelectItem>
                <SelectItem value="error">Errors Only</SelectItem>
                <SelectItem value="click">Clicks</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activity recorded for this user</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                  activity.error_message ? 'border-destructive/50 bg-destructive/5' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">{getActionIcon(activity.action_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getActionColor(activity.action_type)}>
                          {activity.action_type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                        {activity.duration_ms && (
                          <span className="text-xs text-muted-foreground">
                            ({activity.duration_ms}ms)
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1">{getActionDescription(activity)}</p>
                      {activity.url && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {activity.url}
                        </p>
                      )}
                    </div>
                  </div>
                  {(activity.action_details || activity.error_details) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(activity.id)}
                    >
                      {expandedItems.has(activity.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Expanded details */}
                {expandedItems.has(activity.id) && (
                  <div className="mt-3 pt-3 border-t">
                    {activity.error_details && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium mb-2">Error Details:</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(activity.error_details, null, 2)}
                        </pre>
                      </div>
                    )}
                    {activity.action_details && Object.keys(activity.action_details).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Action Details:</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(activity.action_details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activities.length > 0 && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={loadActivities}>
              Refresh Timeline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
