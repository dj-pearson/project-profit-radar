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
    <Card className="w-full">
      <CardHeader className="p-3 sm:p-4 lg:p-6">
        <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
        {activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
            No recent activity
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-2.5 sm:p-3 bg-muted/20 rounded-lg border border-border/30 hover:bg-muted/40 transition-colors">
                <div className={`mt-0.5 shrink-0 ${getActivityColor(activity.type, activity.urgent)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-2">
                    <p className="text-sm sm:text-base font-medium text-foreground leading-tight pr-2">{activity.title}</p>
                    {activity.urgent && (
                      <Badge variant="destructive" className="text-xs self-start shrink-0">
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {activity.description}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{new Date(activity.timestamp).toLocaleDateString()}</span>
                    </div>
                    {activity.user && (
                      <>
                        <span className="hidden sm:inline text-muted-foreground/50">•</span>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{activity.user}</span>
                        </div>
                      </>
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