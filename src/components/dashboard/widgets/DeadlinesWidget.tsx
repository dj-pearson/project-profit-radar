import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isAfter, isBefore, addDays } from 'date-fns';

interface Deadline {
  id: string;
  title: string;
  date: string;
  type: 'project' | 'permit' | 'bond' | 'service';
  priority: 'high' | 'medium' | 'low';
}

export const DeadlinesWidget = () => {
  const { userProfile } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeadlines();
  }, [userProfile]);

  const loadDeadlines = async () => {
    if (!userProfile?.company_id) return;

    try {
      const today = new Date();
      const thirtyDaysFromNow = addDays(today, 30);

      // Load project deadlines
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, end_date, status')
        .eq('company_id', userProfile.company_id)
        .not('end_date', 'is', null)
        .lte('end_date', thirtyDaysFromNow.toISOString())
        .neq('status', 'completed');

      // Load permit deadlines
      const { data: permits } = await supabase
        .from('environmental_permits')
        .select('id, permit_name, expiration_date')
        .eq('company_id', userProfile.company_id)
        .not('expiration_date', 'is', null)
        .lte('expiration_date', thirtyDaysFromNow.toISOString());

      // Load bond deadlines
      const { data: bonds } = await supabase
        .from('bonds')
        .select('id, bond_name, expiry_date')
        .eq('company_id', userProfile.company_id)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString());

      const allDeadlines: Deadline[] = [
        ...(projects || []).map(p => ({
          id: p.id,
          title: p.name,
          date: p.end_date,
          type: 'project' as const,
          priority: isBefore(new Date(p.end_date), addDays(today, 7)) ? 'high' as const : 'medium' as const
        })),
        ...(permits || []).map(p => ({
          id: p.id,
          title: `${p.permit_name} Permit`,
          date: p.expiration_date,
          type: 'permit' as const,
          priority: isBefore(new Date(p.expiration_date), addDays(today, 14)) ? 'high' as const : 'medium' as const
        })),
        ...(bonds || []).map(b => ({
          id: b.id,
          title: `${b.bond_name} Bond`,
          date: b.expiry_date,
          type: 'bond' as const,
          priority: isBefore(new Date(b.expiry_date), addDays(today, 30)) ? 'medium' as const : 'low' as const
        }))
      ];

      // Sort by date
      allDeadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setDeadlines(allDeadlines.slice(0, 5)); // Show top 5
    } catch (error) {
      console.error('Error loading deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return CalendarDays;
      case 'permit': return AlertTriangle;
      case 'bond': return Clock;
      default: return CalendarDays;
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading deadlines...</div>;
  }

  if (deadlines.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        No upcoming deadlines
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deadlines.map((deadline) => {
        const Icon = getTypeIcon(deadline.type);
        return (
          <div key={deadline.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{deadline.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(deadline.date), 'MMM d')}
                </p>
              </div>
            </div>
            <Badge variant={getPriorityColor(deadline.priority)} className="text-xs">
              {deadline.priority}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};