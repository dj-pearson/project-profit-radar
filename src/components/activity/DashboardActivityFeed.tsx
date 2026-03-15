import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  FileText,
  Receipt,
  GitBranch,
  FolderOpen,
  Users,
  Activity,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityItem {
  id: string;
  activity_type: string;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  project_id?: string;
  created_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface DashboardActivityFeedProps {
  /** When provided, only show activity for this project. Otherwise show company-wide activity. */
  projectId?: string;
  /** Maximum number of items to display. Defaults to 20. */
  maxItems?: number;
}

// ---------------------------------------------------------------------------
// Event type configuration
// ---------------------------------------------------------------------------

const EVENT_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'time_entry', label: 'Time Entry' },
  { value: 'daily_report', label: 'Daily Report' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'change_order', label: 'Change Order' },
  { value: 'document', label: 'Document' },
  { value: 'team_update', label: 'Team Update' },
] as const;

type EventTypeValue = (typeof EVENT_TYPES)[number]['value'];

const ICON_MAP: Record<string, React.ReactNode> = {
  time_entry: <Clock className="h-4 w-4" />,
  daily_report: <FileText className="h-4 w-4" />,
  invoice: <Receipt className="h-4 w-4" />,
  change_order: <GitBranch className="h-4 w-4" />,
  document: <FolderOpen className="h-4 w-4" />,
  team_update: <Users className="h-4 w-4" />,
};

const COLOR_MAP: Record<string, string> = {
  time_entry: 'bg-blue-500',
  daily_report: 'bg-green-500',
  invoice: 'bg-purple-500',
  change_order: 'bg-orange-500',
  document: 'bg-yellow-500',
  team_update: 'bg-emerald-500',
};

const getActivityIcon = (type: string) => ICON_MAP[type] ?? <Activity className="h-4 w-4" />;
const getActivityColor = (type: string) => COLOR_MAP[type] ?? 'bg-gray-500';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getUserInitials = (profile?: ActivityItem['user_profiles']): string => {
  if (!profile) return '?';
  return `${profile.first_name?.charAt(0) ?? ''}${profile.last_name?.charAt(0) ?? ''}`.toUpperCase() || '?';
};

const getUserName = (profile?: ActivityItem['user_profiles']): string => {
  if (!profile) return 'Unknown User';
  return `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Unknown User';
};

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

const ActivitySkeleton: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DashboardActivityFeed: React.FC<DashboardActivityFeedProps> = ({
  projectId,
  maxItems = 20,
}) => {
  const { userProfile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<EventTypeValue>('all');

  // ---- Data fetching ----

  const loadActivities = async () => {
    if (!userProfile?.company_id) return;

    try {
      let query = supabase
        .from('activity_feed')
        .select(`
          *,
          user_profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setActivities((data as unknown as ActivityItem[]) ?? []);
    } catch (error) {
      console.error('Error loading activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [userProfile, projectId, maxItems]);

  // ---- Real-time subscription ----

  useEffect(() => {
    if (!userProfile?.company_id) return;

    const channelName = projectId
      ? `dashboard-activity-feed-${projectId}`
      : 'dashboard-activity-feed';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: `company_id=eq.${userProfile.company_id}`,
        },
        async (payload) => {
          const newActivity = payload.new as Record<string, unknown>;

          // If scoped to a project, ignore events for other projects
          if (projectId && newActivity.project_id !== projectId) return;

          // Fetch user profile for the new activity
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, email')
            .eq('id', newActivity.user_id as string)
            .single();

          const activityWithProfile: ActivityItem = {
            ...(newActivity as unknown as ActivityItem),
            user_profiles: profile ?? undefined,
          };

          setActivities((prev) => {
            const updated = [activityWithProfile, ...prev];
            // Keep list within maxItems
            return updated.slice(0, maxItems);
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile, projectId, maxItems]);

  // ---- Filtering ----

  const filteredActivities = useMemo(() => {
    if (filterType === 'all') return activities;
    return activities.filter((a) => a.activity_type === filterType);
  }, [activities, filterType]);

  // ---- Render helpers ----

  const headerTitle = projectId ? 'Project Activity' : 'Company Activity';

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{headerTitle}</CardTitle>
            <Skeleton className="h-9 w-[140px]" />
          </div>
        </CardHeader>
        <CardContent>
          <ActivitySkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{headerTitle}</CardTitle>
          <Select
            value={filterType}
            onValueChange={(val) => setFilterType(val as EventTypeValue)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((et) => (
                <SelectItem key={et.value} value={et.value}>
                  {et.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No activity yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {filterType !== 'all'
                ? 'No activities match the selected filter. Try selecting a different type.'
                : projectId
                  ? 'Activity for this project will appear here as events occur.'
                  : 'Company-wide activity will appear here as your team works.'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[480px]">
            <div className="space-y-3 pr-4">
              {filteredActivities.map((activity) => {
                const initials = getUserInitials(activity.user_profiles);
                const name = getUserName(activity.user_profiles);

                return (
                  <Card
                    key={activity.id}
                    className="border-l-4 border-l-primary/20"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-full ${getActivityColor(activity.activity_type)} text-white flex-shrink-0`}
                        >
                          {getActivityIcon(activity.activity_type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(activity.created_at),
                                { addSuffix: true },
                              )}
                            </span>
                          </div>

                          <h4 className="font-medium text-sm mb-1">
                            {activity.title}
                          </h4>

                          {activity.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {activity.description}
                            </p>
                          )}

                          {activity.entity_type && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {activity.entity_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardActivityFeed;
