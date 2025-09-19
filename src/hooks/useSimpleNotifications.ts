import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface SimpleNotification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  type: 'project_update' | 'approval_request' | 'safety_incident' | 'task_assignment' | 'budget_alert' | 'timeline_change' | 'message' | 'system';
  title: string;
  message: string;
  data?: any;
  read_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  sender_profile?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

// Simple in-memory notification system for demonstration
export const useSimpleNotifications = () => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<SimpleNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Simulate notifications data
  const simulateNotifications = useCallback(() => {
    if (!userProfile) return;

    const simulatedNotifications: SimpleNotification[] = [
      {
        id: 'notif-1',
        recipient_id: userProfile.id,
        sender_id: 'user-2',
        type: 'project_update',
        title: 'Project Status Update',
        message: 'Kitchen Remodel - Johnson project has reached 75% completion. Ready for next phase inspection.',
        priority: 'normal',
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        sender_profile: {
          first_name: 'John',
          last_name: 'Smith',
          avatar_url: undefined
        }
      },
      {
        id: 'notif-2',
        recipient_id: userProfile.id,
        sender_id: 'user-3',
        type: 'budget_alert',
        title: 'Budget Alert',
        message: 'Office Renovation project is approaching 90% of allocated budget. Review required.',
        priority: 'high',
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        sender_profile: {
          first_name: 'Sarah',
          last_name: 'Johnson',
          avatar_url: undefined
        }
      },
      {
        id: 'notif-3',
        recipient_id: userProfile.id,
        type: 'safety_incident',
        title: 'Safety Incident Report',
        message: 'Minor incident reported at Job Site Alpha. All team members are safe. Report filed for review.',
        priority: 'urgent',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        read_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // Read 1 hour ago
      },
      {
        id: 'notif-4',
        recipient_id: userProfile.id,
        sender_id: 'user-4',
        type: 'task_assignment',
        title: 'New Task Assignment',
        message: 'You have been assigned to complete electrical inspection for Retail Fitout project.',
        priority: 'normal',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        sender_profile: {
          first_name: 'Mike',
          last_name: 'Davis',
          avatar_url: undefined
        }
      },
      {
        id: 'notif-5',
        recipient_id: userProfile.id,
        type: 'system',
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight from 11 PM to 1 AM EST. Brief service interruption expected.',
        priority: 'low',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        read_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // Read 5 hours ago
      }
    ];

    setNotifications(simulatedNotifications);
    setUnreadCount(simulatedNotifications.filter(n => !n.read_at).length);
  }, [userProfile]);

  // Load notifications
  const loadNotifications = useCallback(async (limit = 50) => {
    if (!userProfile) return;

    setIsLoading(true);
    // Simulate loading delay
    setTimeout(() => {
      simulateNotifications();
      setIsLoading(false);
    }, 300);
  }, [userProfile, simulateNotifications]);

  // Send notification (simulation)
  const sendNotification = useCallback(async (
    recipientId: string,
    type: SimpleNotification['type'],
    title: string,
    message: string,
    data?: any,
    priority: SimpleNotification['priority'] = 'normal'
  ) => {
    if (!userProfile) return null;

    const newNotification: SimpleNotification = {
      id: `notif-${Date.now()}`,
      recipient_id: recipientId,
      sender_id: userProfile.id,
      type,
      title,
      message,
      data,
      priority,
      created_at: new Date().toISOString(),
      sender_profile: {
        first_name: userProfile.first_name || 'Unknown',
        last_name: userProfile.last_name || 'User',
        avatar_url: undefined
      }
    };

    // Simulate sending to self for demo
    if (recipientId === userProfile.id) {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);

      toast({
        title: "Notification Sent",
        description: "Demo notification has been created.",
      });
    }

    return newNotification;
  }, [userProfile]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.read_at) return;

    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, read_at: new Date().toISOString() }
          : n
      )
    );

    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [notifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userProfile) return;

    const now = new Date().toISOString();
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at || now }))
    );

    setUnreadCount(0);

    toast({
      title: "All Read",
      description: "All notifications marked as read.",
    });
  }, [userProfile]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    const wasUnread = notifications.find(n => n.id === notificationId && !n.read_at);
    if (wasUnread) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    toast({
      title: "Deleted",
      description: "Notification has been deleted.",
    });
  }, [notifications]);

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