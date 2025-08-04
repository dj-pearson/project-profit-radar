import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Users, 
  FileText, 
  Clock, 
  Calculator,
  Settings,
  Building,
  BarChart3
} from "lucide-react";

interface QuickActionsProps {
  userRole: string;
  onAction: (action: string) => void;
}

export const QuickActions = ({ userRole, onAction }: QuickActionsProps) => {
  const getActionsForRole = () => {
    const baseActions = [
      { key: 'reports', label: 'View Reports', icon: BarChart3 },
    ];

    if (userRole === 'root_admin') {
      return [
        { key: 'companies', label: 'Manage Companies', icon: Building },
        { key: 'users', label: 'System Users', icon: Users },
        { key: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
        { key: 'settings', label: 'System Settings', icon: Settings },
      ];
    }

    if (userRole === 'admin' || userRole === 'project_manager') {
      return [
        { key: 'create_project', label: 'Create Project', icon: Plus },
        { key: 'manage_team', label: 'Manage Team', icon: Users },
        { key: 'job_costing', label: 'Job Costing', icon: Calculator },
        { key: 'documents', label: 'Documents', icon: FileText },
        ...baseActions,
      ];
    }

    if (userRole === 'field_supervisor') {
      return [
        { key: 'daily_report', label: 'Daily Report', icon: FileText },
        { key: 'time_tracking', label: 'Time Tracking', icon: Clock },
        { key: 'crew_management', label: 'Crew Management', icon: Users },
        ...baseActions,
      ];
    }

    if (userRole === 'accounting') {
      return [
        { key: 'job_costing', label: 'Job Costing', icon: Calculator },
        { key: 'invoicing', label: 'Invoicing', icon: FileText },
        { key: 'financial_reports', label: 'Financial Reports', icon: BarChart3 },
        ...baseActions,
      ];
    }

    return baseActions;
  };

  const actions = getActionsForRole();

  return (
    <Card className="w-full">
      <CardHeader className="p-3 sm:p-4 lg:p-6">
        <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs sm:text-sm min-h-[44px] sm:min-h-[40px] px-3 py-2.5 hover:bg-accent transition-colors"
              onClick={() => onAction(action.key)}
            >
              <action.icon className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
              <span className="truncate text-left">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};