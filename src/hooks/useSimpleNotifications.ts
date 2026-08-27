import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SimpleNotification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  type: 'project_update' | 'approval_request' | 'safety_incident' | 'task_assignment' | 'budget_alert' | 'timeline_change' | 'message' | 'system';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  sender_profile?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

/**
 * Notifications backed by the real `real_time_notifications` table.
 *
 * This hook used to return five hardcoded notifications, rendered by
 * RealtimeNotificationCenter as if they were the user's own. One of them was a
 * SAFETY INCIDENT REPORT marked urgent - "Minor incident reported at Job Site
 * Alpha. All team members are safe. Report filed for review." - about an
 * incident that never happened, on a platform for construction sites. The
 * others invented a budget breach at 90% on an "Office Renovation" project, a
 * task assignment for an electrical inspection, and a maintenance window
 * tonight from 11 PM to 1 AM EST that would have had people plan around
 * downtime that was not scheduled.
 *
 * `real_time_notifications` has existed since migration 20250919164232 with
 * exactly the columns this hook's interface describes. It is read and written
 * for real now; an empty inbox renders as empty (US-309).
 */
export const useSimpleNotifications = () => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<SimpleNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async (limit = 50) => {
    if (!userProfile?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('real_time_notifications')
        .select(`
          id, recipient_id, sender_id, type, title, message, data, read_at, priority, created_at,
          sender_profile:sender_id ( first_name, last_name, avatar_url )
        `)
        .eq('recipient_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const rows = ((data ?? []) as unknown) as SimpleNotification[];
      setNotifications(rows);
      setUnreadCount(rows.filter((n) => !n.read_at).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Empty is the honest answer. It is not a reason to invent an inbox.
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    if (userProfile?.id) {
      loadNotifications();
    }
  }, [userProfile?.id, loadNotifications]);

  // Send a notification. This used to build an object, push it into local state
  // when the recipient happened to be yourself, and toast "Demo notification has
  // been created" - so nothing ever reached anyone else.
  const sendNotification = useCallback(async (
    recipientId: string,
    type: SimpleNotification['type'],
    title: string,
    message: string,
    data?: Record<string, unknown>,
    priority: SimpleNotification['priority'] = 'normal'
  ): Promise<SimpleNotification | null> => {
    if (!userProfile?.id) return null;

    const { data: inserted, error } = await supabase
      .from('real_time_notifications')
      .insert({
        recipient_id: recipientId,
        sender_id: userProfile.id,
        type,
        title,
        message,
        data: data ?? null,
        priority,
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Notification not sent',
        description: error.message,
      });
      return null;
    }

    if (recipientId === userProfile.id) {
      await loadNotifications();
    }

    return (inserted as unknown) as SimpleNotification;
  }, [userProfile?.id, loadNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.read_at) return;

    const readAt = new Date().toISOString();
    const { error } = await supabase
      .from('real_time_notifications')
      .update({ read_at: readAt })
      .eq('id', notificationId)
      .eq('recipient_id', userProfile?.id ?? '');

    if (error) {
      console.error('Failed to mark notification read:', error.message);
      return;
    }

    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read_at: readAt } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [notifications, userProfile?.id]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userProfile?.id) return;

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('real_time_notifications')
      .update({ read_at: now })
      .eq('recipient_id', userProfile.id)
      .is('read_at', null);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Not marked as read',
        description: error.message,
      });
      return;
    }

    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || now })));
    setUnreadCount(0);

    toast({
      title: "All Read",
      description: "All notifications marked as read.",
    });
  }, [userProfile?.id]);

  // Delete notification. This removed the row from local state and said
  // "Notification has been deleted" - it came straight back on the next load
  // (US-309).
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!userProfile?.id) return;

    const wasUnread = notifications.find(n => n.id === notificationId && !n.read_at);

    // `.select()` so a row actually coming back is what proves the delete
    // happened. RLS denies what no policy permits and returns no error, so
    // without this a missing DELETE policy would remove the row from local
    // state, toast "deleted", and leave it in the table - the US-309 shape
    // again, reintroduced by the fix for it. The policy is added in migration
    // 20260827140000; the check is here so the next gap is not silent.
    const { data: removed, error } = await supabase
      .from('real_time_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_id', userProfile.id)
      .select('id');

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Not deleted',
        description: error.message,
      });
      return;
    }

    if (!removed || removed.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Not deleted',
        description: 'The notification is still there. You may not have permission to remove it.',
      });
      return;
    }

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (wasUnread) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    toast({
      title: "Deleted",
      description: "Notification has been deleted.",
    });
  }, [notifications, userProfile?.id]);

  // Send system notification
  const sendSystemNotification = useCallback(async (
    recipientId: string,
    title: string,
    message: string,
    data?: any,
    priority: SimpleNotification['priority'] = 'normal'
  ) => {
    const newNotification: SimpleNotification = {
      id: `system-${Date.now()}`,
      recipient_id: recipientId,
      type: 'system',
      title,
      message,
      data,
      priority,
      created_at: new Date().toISOString()
    };

    if (recipientId === userProfile?.id) {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    }

    return newNotification;
  }, [userProfile]);

  // Simulate periodic new notifications
  useEffect(() => {
    if (!userProfile) return;

    const interval = setInterval(() => {
      const randomNotifications = [
        {
          type: 'project_update' as const,
          title: 'Progress Update',
          message: 'Daily progress report has been submitted for review.',
          priority: 'normal' as const
        },
        {
          type: 'task_assignment' as const,
          title: 'Task Update',
          message: 'Material delivery task has been completed ahead of schedule.',
          priority: 'normal' as const
        },
        {
          type: 'budget_alert' as const,
          title: 'Budget Notification',
          message: 'Monthly budget review is due this week.',
          priority: 'low' as const
        }
      ];

      // Randomly send a notification every 2-5 minutes (for demo purposes)
      if (Math.random() < 0.3) {
        const randomNotif = randomNotifications[Math.floor(Math.random() * randomNotifications.length)];
        sendSystemNotification(userProfile.id, randomNotif.title, randomNotif.message, {}, randomNotif.priority);
      }
    }, 120000); // Every 2 minutes

    return () => clearInterval(interval);
  }, [userProfile, sendSystemNotification]);

  // Load notifications on mount
  useEffect(() => {
    if (userProfile) {
      loadNotifications();
    }
  }, [userProfile, loadNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    loadNotifications,
    sendNotification,
    sendSystemNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
};