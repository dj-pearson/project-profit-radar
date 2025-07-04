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
}

export const RecentActivity = ({ activities }: RecentActivityProps) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_update':
        return <FileText className="h-4 w-4" />;
      case 'document_uploaded':
        return <FileText className="h-4 w-4" />;
      case 'task_completed':
        return <Clock className="h-4 w-4" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
        {activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-4 text-xs sm:text-sm">
            No recent activity
          </div>
        ) : (
          activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-start space-x-2 sm:space-x-3">
              <div className={`mt-1 shrink-0 ${getActivityColor(activity.type, activity.urgent)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs sm:text-sm font-medium truncate">{activity.title}</p>
                  {activity.urgent && (
                    <Badge variant="destructive" className="text-xs shrink-0">
                      Urgent
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {activity.description}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1 shrink-0" />
                    <span>{new Date(activity.timestamp).toLocaleDateString()}</span>
                  </div>
                  {activity.user && (
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1 shrink-0" />
                      <span className="truncate">{activity.user}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};