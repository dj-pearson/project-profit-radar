import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  FileText, 
  CheckSquare, 
  Folder,
  Upload,
  Edit,
  UserPlus
} from 'lucide-react';

interface ActivityItem {
  id: string;
  activity_type: string;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'message':
      return <MessageSquare className="h-4 w-4" />;
    case 'file_upload':
      return <Upload className="h-4 w-4" />;
    case 'task_update':
      return <CheckSquare className="h-4 w-4" />;
    case 'project_update':
      return <Folder className="h-4 w-4" />;
    case 'document_edit':
      return <Edit className="h-4 w-4" />;
    case 'user_join':
      return <UserPlus className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'message':
      return 'bg-blue-500';
    case 'file_upload':
      return 'bg-green-500';
    case 'task_update':
      return 'bg-orange-500';
    case 'project_update':
      return 'bg-purple-500';
    case 'document_edit':
      return 'bg-yellow-500';
    case 'user_join':
      return 'bg-emerald-500';
    default:
      return 'bg-gray-500';
  }
};

export const ActivityFeed: React.FC = () => {
  const { userProfile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
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
        .limit(50);

      if (error) throw error;
      setActivities(data as any || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [userProfile]);

  // Real-time subscription for new activities
  useEffect(() => {
    if (!userProfile?.company_id) return;

    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: `company_id=eq.${userProfile.company_id}`
        },
        async (payload) => {
          const newActivity = payload.new;
          
          // Get user profile for the activity
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, email')
            .eq('id', newActivity.user_id)
            .single();

          const activityWithProfile = {
            ...newActivity,
            user_profiles: profile
          };

          setActivities(prev => [activityWithProfile as any, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-sm text-muted-foreground">Loading activity feed...</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Recent Activity</h3>
          <Badge variant="secondary">{activities.length} activities</Badge>
        </div>

        {activities.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No activity yet</h3>
              <p className="text-sm text-muted-foreground">
                Team activities will appear here as they happen
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const userInitials = activity.user_profiles 
                ? `${activity.user_profiles.first_name?.charAt(0) || ''}${activity.user_profiles.last_name?.charAt(0) || ''}`
                : '?';

              const userName = activity.user_profiles 
                ? `${activity.user_profiles.first_name} ${activity.user_profiles.last_name}`
                : 'Unknown User';

              return (
                <Card key={activity.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)} text-white`}>
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{userName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-sm mb-1">{activity.title}</h4>
                        
                        {activity.description && (
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
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
        )}
      </div>
    </ScrollArea>
  );
};