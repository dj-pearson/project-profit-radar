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
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No recent activity
          </div>
        ) : (
          activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`mt-1 ${getActivityColor(activity.type, activity.urgent)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{activity.title}</p>
                  {activity.urgent && (
                    <Badge variant="destructive" className="text-xs">
                      Urgent
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activity.description}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(activity.timestamp).toLocaleDateString()}
                  {activity.user && (
                    <>
                      <User className="h-3 w-3 ml-2 mr-1" />
                      {activity.user}
                    </>
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