import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  Calendar,
  User,
  Image as ImageIcon,
  FileText,
  DollarSign,
  Clock,
  Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProjectUpdate {
  id: string;
  type: 'milestone' | 'issue' | 'change_order' | 'general' | 'photo' | 'schedule' | 'budget';
  title: string;
  description: string;
  timestamp: string;
  author?: string;
  isRead?: boolean;
  priority?: 'low' | 'medium' | 'high';
  attachments?: {
    type: 'image' | 'document';
    url: string;
    thumbnail?: string;
  }[];
}

interface ClientUpdatesFeedProps {
  updates: ProjectUpdate[];
  onMarkAsRead?: (updateId: string) => void;
  onViewAttachment?: (url: string) => void;
}

export const ClientUpdatesFeed: React.FC<ClientUpdatesFeedProps> = ({
  updates,
  onMarkAsRead,
  onViewAttachment
}) => {
  const getUpdateIcon = (type: ProjectUpdate['type']) => {
    switch (type) {
      case 'milestone':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'issue':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'change_order':
        return <DollarSign className="h-5 w-5 text-blue-600" />;
      case 'photo':
        return <ImageIcon className="h-5 w-5 text-purple-600" />;
      case 'schedule':
        return <Calendar className="h-5 w-5 text-orange-600" />;
      case 'budget':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'general':
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getUpdateTypeBadge = (type: ProjectUpdate['type']) => {
    const badgeMap: Record<ProjectUpdate['type'], { label: string; className: string }> = {
      milestone: { label: 'Milestone', className: 'bg-green-600 text-white' },
      issue: { label: 'Issue', className: 'bg-red-600 text-white' },
      change_order: { label: 'Change Order', className: 'bg-blue-600 text-white' },
      photo: { label: 'Photos', className: 'bg-purple-600 text-white' },
      schedule: { label: 'Schedule', className: 'bg-orange-600 text-white' },
      budget: { label: 'Budget', className: 'bg-green-600 text-white' },
      general: { label: 'Update', className: 'bg-gray-600 text-white' },
    };

    const badge = badgeMap[type];
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getPriorityBadge = (priority?: 'low' | 'medium' | 'high') => {
    if (!priority || priority === 'low') return null;

    return (
      <Badge
        variant="outline"
        className={cn(
          priority === 'high' && 'border-red-600 text-red-600',
          priority === 'medium' && 'border-yellow-600 text-yellow-600'
        )}
      >
        {priority === 'high' && 'High Priority'}
        {priority === 'medium' && 'Medium Priority'}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 3600);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const unreadCount = updates.filter(u => !u.isRead).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Updates</CardTitle>
            <CardDescription>
              Stay informed about your project progress
            </CardDescription>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-blue-600 text-white">
              {unreadCount} New
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {updates.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Updates Yet</h3>
            <p className="text-muted-foreground">
              Project updates will appear here as work progresses
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update, index) => (
              <div
                key={update.id}
                className={cn(
                  "relative border-l-4 pl-6 pb-6",
                  update.isRead ? 'border-gray-300' : 'border-blue-600',
                  index === updates.length - 1 && 'pb-0'
                )}
              >
                {/* Timeline dot */}
                <div className="absolute -left-3 top-0 bg-background">
                  {getUpdateIcon(update.type)}
                </div>

                {/* Connector line */}
                {index !== updates.length - 1 && (
                  <div className="absolute left-0 top-8 bottom-0 w-0.5 bg-gray-200" />
                )}

                {/* Update content */}
                <div className={cn(
                  "space-y-3",
                  !update.isRead && "bg-blue-50/50 dark:bg-blue-950/20 -ml-6 pl-6 -mr-4 pr-4 py-3 rounded-r-lg"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getUpdateTypeBadge(update.type)}
                        {getPriorityBadge(update.priority)}
                        {!update.isRead && (
                          <Badge variant="outline" className="border-blue-600 text-blue-600">
                            New
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-base mt-2">{update.title}</h4>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {update.description}
                  </p>

                  {/* Attachments */}
                  {update.attachments && update.attachments.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {update.attachments.map((attachment, idx) => (
                        <button
                          key={idx}
                          onClick={() => onViewAttachment?.(attachment.url)}
                          className="relative group"
                        >
                          {attachment.type === 'image' ? (
                            <div className="relative w-20 h-20 rounded overflow-hidden border-2 border-transparent group-hover:border-blue-500 transition-colors">
                              <img
                                src={attachment.thumbnail || attachment.url}
                                alt="Attachment"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-muted transition-colors">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs">Document</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimestamp(update.timestamp)}
                      </span>
                      {update.author && (
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {update.author}
                        </span>
                      )}
                    </div>
                    {!update.isRead && onMarkAsRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarkAsRead(update.id)}
                        className="text-xs"
                      >
                        Mark as read
                      </Button>
                    )}
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
