import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, FileText, AlertTriangle } from "lucide-react";

interface ActivityItem {
  id: string;
  type: 'project_update' | 'document_uploaded' | 'task_completed' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  urgent?: boolean;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  /** Maximum number of activities to show */
  maxItems?: number;
}

export const RecentActivity = ({ activities, maxItems = 5 }: RecentActivityProps) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_update':
        return <FileText className="h-4 w-4" aria-hidden="true" />;
      case 'document_uploaded':
        return <FileText className="h-4 w-4" aria-hidden="true" />;
      case 'task_completed':
        return <Clock className="h-4 w-4" aria-hidden="true" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
      default:
        return <Clock className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const getActivityColor = (type: string, urgent?: boolean) => {
    if (urgent) return 'text-red-500';
    switch (type) {
      case 'task_completed':
        return 'text-green-500';
      case 'alert':
        return 'text-yellow-500';
      default:
        return 'text-construction-blue';
    }
  };

  const getActivityTypeLabel = (type: string): string => {
    switch (type) {
      case 'project_update':
        return 'Project update';
      case 'document_uploaded':
        return 'Document uploaded';
      case 'task_completed':
        return 'Task completed';
      case 'alert':
        return 'Alert';
      default:
        return 'Activity';
    }
  };

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="w-full" role="region" aria-labelledby="recent-activity-title">
      <CardHeader className="p-3 sm:p-4 lg:p-6">
        <CardTitle
          id="recent-activity-title"
          className="text-sm sm:text-base lg:text-lg font-semibold"
        >
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
        {activities.length === 0 ? (
          <div
            className="text-center text-muted-foreground py-6 sm:py-8 text-sm"
            role="status"
          >
            No recent activity
          </div>
        ) : (
          <ul
            className="space-y-3 sm:space-y-4"
            aria-label={`Recent activity feed, ${Math.min(activities.length, maxItems)} items`}
          >
            {activities.slice(0, maxItems).map((activity, index) => (
              <li
                key={activity.id}
                className="flex items-start gap-3 p-2.5 sm:p-3 bg-muted/20 rounded-lg border border-border/30 hover:bg-muted/40 transition-colors"
                aria-label={`${getActivityTypeLabel(activity.type)}: ${activity.title}${activity.urgent ? ', urgent' : ''}`}
              >
                <div
                  className={`mt-0.5 shrink-0 ${getActivityColor(activity.type, activity.urgent)}`}
                  aria-hidden="true"
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-2">
                    <p className="text-sm sm:text-base font-medium text-foreground leading-tight pr-2">
                      {activity.title}
                    </p>
                    {activity.urgent && (
                      <Badge
                        variant="destructive"
                        className="text-xs self-start shrink-0"
                        aria-label="Urgent activity"
                      >
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {activity.description}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <time dateTime={activity.timestamp}>
                        {formatDate(activity.timestamp)}
                      </time>
                    </div>
                    {activity.user && (
                      <>
                        <span className="hidden sm:inline text-muted-foreground/50" aria-hidden="true">•</span>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{activity.user}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Screen reader summary */}
        <div className="sr-only" role="status" aria-live="polite">
          Showing {Math.min(activities.length, maxItems)} of {activities.length} recent activities
        </div>
      </CardContent>
    </Card>
  );
};
