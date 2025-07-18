import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/utils/formatters';
import { 
  Phone, 
  Mail, 
  Calendar, 
  MessageSquare, 
  FileText, 
  DollarSign,
  User,
  Clock,
  Filter
} from 'lucide-react';

interface Activity {
  id: string;
  activity_type: string;
  activity_date: string;
  description: string;
  outcome?: string;
  duration_minutes?: number;
  lead_id?: string;
  opportunity_id?: string;
  created_by: string;
  created_at: string;
  lead?: {
    first_name: string;
    last_name: string;
    company_name?: string;
  };
  opportunity?: {
    name: string;
    estimated_value: number;
  };
}

interface ActivityStreamProps {
  leadId?: string;
  opportunityId?: string;
  limit?: number;
}

export const ActivityStream: React.FC<ActivityStreamProps> = ({ 
  leadId, 
  opportunityId, 
  limit = 50 
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadActivities();
  }, [leadId, opportunityId, filter]);

  const loadActivities = async () => {
    try {
      let query = supabase
        .from('lead_activities')
        .select(`
          *,
          lead:leads(first_name, last_name, company_name),
          opportunity:procurement_opportunities(name, estimated_value)
        `)
        .order('activity_date', { ascending: false })
        .limit(limit);

      // Apply filters
      if (leadId) {
        query = query.eq('lead_id', leadId);
      }
      if (opportunityId) {
        query = query.eq('opportunity_id', opportunityId);
      }
      if (filter !== 'all') {
        query = query.eq('activity_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data?.map(activity => {
        const opp = activity.opportunity;
        return {
          ...activity,
          opportunity: opp &&
                      typeof opp === 'object' &&
                      opp !== null &&
                      !('error' in opp) &&
                      'name' in opp 
            ? opp as { name: string; estimated_value: number; }
            : undefined
        };
      }) || []);
    } catch (error: any) {
      toast({
        title: "Error loading activities",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      call: Phone,
      email: Mail,
      meeting: Calendar,
      note: MessageSquare,
      proposal: FileText,
      quote: DollarSign,
      follow_up: Clock,
    };
    const IconComponent = icons[type as keyof typeof icons] || User;
    return <IconComponent className="h-4 w-4" />;
  };

  const getActivityColor = (type: string) => {
    const colors = {
      call: 'text-blue-600 bg-blue-100',
      email: 'text-green-600 bg-green-100',
      meeting: 'text-purple-600 bg-purple-100',
      note: 'text-yellow-600 bg-yellow-100',
      proposal: 'text-orange-600 bg-orange-100',
      quote: 'text-emerald-600 bg-emerald-100',
      follow_up: 'text-gray-600 bg-gray-100',
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getOutcomeBadge = (outcome?: string) => {
    if (!outcome) return null;
    
    const variants = {
      completed: 'default',
      scheduled: 'secondary',
      canceled: 'destructive',
      no_answer: 'outline',
      interested: 'default',
      not_interested: 'destructive'
    };
    
    return (
      <Badge variant={(variants[outcome as keyof typeof variants] || 'outline') as "default" | "destructive" | "secondary" | "outline"}>
        {outcome.replace('_', ' ')}
      </Badge>
    );
  };

  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'call', label: 'Calls' },
    { value: 'email', label: 'Emails' },
    { value: 'meeting', label: 'Meetings' },
    { value: 'note', label: 'Notes' },
    { value: 'proposal', label: 'Proposals' },
    { value: 'quote', label: 'Quotes' },
    { value: 'follow_up', label: 'Follow-ups' }
  ];

  if (loading) {
    return <div className="p-6">Loading activities...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Stream</CardTitle>
            <CardDescription>
              Recent interactions and activities
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              {activityTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No activities yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking interactions with leads and opportunities
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)}`}>
                  {getActivityIcon(activity.activity_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-sm">
                        {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                      </h4>
                      {getOutcomeBadge(activity.outcome)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(activity.activity_date)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {activity.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      {activity.lead && (
                        <span>
                          Lead: {activity.lead.first_name} {activity.lead.last_name}
                          {activity.lead.company_name && ` (${activity.lead.company_name})`}
                        </span>
                      )}
                      {activity.opportunity && (
                        <span>
                          Opportunity: {activity.opportunity.name}
                        </span>
                      )}
                      {activity.duration_minutes && (
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{activity.duration_minutes}m</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};