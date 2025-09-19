import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  X,
  Clock,
  AlertTriangle,
  MessageSquare,
  DollarSign,
  Calendar,
  Users,
  Settings,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSimpleNotifications, SimpleNotification } from '@/hooks/useSimpleNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface RealtimeNotificationCenterProps {
  trigger?: React.ReactNode;
  showInSheet?: boolean;
}

const NOTIFICATION_ICONS = {
  project_update: Calendar,
  approval_request: CheckCheck,
  safety_incident: AlertTriangle,
  task_assignment: Users,
  budget_alert: DollarSign,
  timeline_change: Clock,
  message: MessageSquare,
  system: Settings
};

const PRIORITY_COLORS = {
  low: 'border-blue-200 bg-blue-50 text-blue-800',
  normal: 'border-gray-200 bg-gray-50 text-gray-800',
  high: 'border-orange-200 bg-orange-50 text-orange-800',
  urgent: 'border-red-200 bg-red-50 text-red-800'
};

export const RealtimeNotificationCenter: React.FC<RealtimeNotificationCenterProps> = ({
  trigger,
  showInSheet = true
}) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useSimpleNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | SimpleNotification['type']>('all');

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read_at;
    return notification.type === filter;
  });

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'Recently';
    }
  };

  const getPriorityBadge = (priority: SimpleNotification['priority']) => {
    const variants = {
      low: 'outline' as const,
      normal: 'secondary' as const,
      high: 'default' as const,
      urgent: 'destructive' as const
    };

    return (
      <Badge variant={variants[priority]} className="text-xs">
        {priority}
      </Badge>
    );
  };

  const NotificationItem: React.FC<{ notification: SimpleNotification }> = ({ notification }) => {
    const Icon = NOTIFICATION_ICONS[notification.type];
    const isUnread = !notification.read_at;

    return (
      <Card 
        className={cn(
          'transition-all hover:shadow-sm cursor-pointer',
          isUnread && 'ring-2 ring-primary/20 border-primary/30',
          PRIORITY_COLORS[notification.priority]
        )}
        onClick={() => markAsRead(notification.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className={cn(
                  'text-sm truncate',
                  isUnread ? 'font-semibold' : 'font-medium'
                )}>
                  {notification.title}
                </h4>
                
                <div className="flex items-center gap-2 ml-2">
                  {notification.priority !== 'normal' && getPriorityBadge(notification.priority)}
                  {isUnread && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {notification.message}
              </p>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {notification.sender_profile && (
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={notification.sender_profile.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {(notification.sender_profile.first_name?.[0] || '') +
                           (notification.sender_profile.last_name?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {notification.sender_profile.first_name} {notification.sender_profile.last_name}
                      </span>
                    </div>
                  )}
                  <span>{formatTimeAgo(notification.created_at)}</span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isUnread ? (
                      <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                        <Check className="h-4 w-4 mr-2" />
                        Mark as read
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Already read
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => deleteNotification(notification.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const NotificationsList = () => (
    <div className="space-y-3">
      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">No notifications</h3>
          <p className="text-sm text-muted-foreground">
            {filter === 'unread' 
              ? "You're all caught up!" 
              : "You'll see notifications here when they arrive"
            }
          </p>
        </div>
      ) : (
        filteredNotifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))
      )}
    </div>
  );

  const NotificationTrigger = () => (
    <Button
      variant="outline"
      size="sm"
      className="relative"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );

  const NotificationContent = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            {notifications.length} total • {unreadCount} unread
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="project_update">
            Projects
          </TabsTrigger>
          <TabsTrigger value="safety_incident">
            Safety
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <NotificationsList />
        </TabsContent>

        <TabsContent value="unread" className="mt-6">
          <NotificationsList />
        </TabsContent>

        <TabsContent value="project_update" className="mt-6">
          <NotificationsList />
        </TabsContent>

        <TabsContent value="safety_incident" className="mt-6">
          <NotificationsList />
        </TabsContent>
      </Tabs>
    </div>
  );

  if (showInSheet) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          {trigger || <NotificationTrigger />}
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>
              Stay up to date with your projects and team
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <NotificationContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Real-time updates and alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NotificationContent />
      </CardContent>
    </Card>
  );
};