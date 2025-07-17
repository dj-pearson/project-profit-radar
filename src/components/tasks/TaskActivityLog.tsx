import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Activity, Edit, MessageSquare, Paperclip, CheckSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ActivityLogEntry {
  id: string;
  action_type: string;
  description: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface TaskActivityLogProps {
  taskId: string;
}

const ACTIVITY_ICONS = {
  created: Edit,
  updated: Edit,
  status_changed: Activity,
  comment_added: MessageSquare,
  attachment_added: Paperclip,
  subtask_added: CheckSquare,
  subtask_completed: CheckSquare,
  time_logged: Clock,
  assigned: Edit
};

const ACTIVITY_COLORS = {
  created: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  status_changed: 'bg-purple-100 text-purple-800',
  comment_added: 'bg-yellow-100 text-yellow-800',
  attachment_added: 'bg-gray-100 text-gray-800',
  subtask_added: 'bg-indigo-100 text-indigo-800',
  subtask_completed: 'bg-green-100 text-green-800',
  time_logged: 'bg-orange-100 text-orange-800',
  assigned: 'bg-blue-100 text-blue-800'
};

export const TaskActivityLog: React.FC<TaskActivityLogProps> = ({ taskId }) => {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityLog();
  }, [taskId]);

  const loadActivityLog = async () => {
    try {
      const { data } = await supabase
        .from('task_activity_logs')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(50);

      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activity log:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (actionType: string) => {
    const IconComponent = ACTIVITY_ICONS[actionType as keyof typeof ACTIVITY_ICONS] || Activity;
    return <IconComponent className="h-3 w-3" />;
  };

  const getActivityColor = (actionType: string) => {
    return ACTIVITY_COLORS[actionType as keyof typeof ACTIVITY_COLORS] || 'bg-gray-100 text-gray-800';
  };

  const formatActivityDescription = (activity: ActivityLogEntry) => {
    const { action_type, description, old_value, new_value } = activity;
    
    switch (action_type) {
      case 'status_changed':
        return `changed status from "${old_value || 'unknown'}" to "${new_value || 'unknown'}"`;
      case 'assigned':
        return `assigned task to ${new_value || 'someone'}`;
      case 'time_logged':
        return `logged ${new_value || 0} hours`;
      case 'subtask_completed':
        return `completed subtask "${new_value || 'Unknown'}"`;
      default:
        return description || `performed ${action_type.replace('_', ' ')}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading activity...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No activity yet. Actions on this task will appear here.
        </p>
      ) : (
        activities.map((activity, index) => (
          <Card key={activity.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {activity.user_profiles?.first_name?.charAt(0)}
                    {activity.user_profiles?.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {activity.user_profiles?.first_name} {activity.user_profiles?.last_name}
                    </span>
                    <Badge 
                      className={`${getActivityColor(activity.action_type)} text-xs`}
                      variant="outline"
                    >
                      <span className="mr-1">{getActivityIcon(activity.action_type)}</span>
                      {activity.action_type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {formatActivityDescription(activity)}
                  </p>
                  
                  {activity.description && activity.description !== formatActivityDescription(activity) && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      "{activity.description}"
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};