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
    <Card>
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 sm:px-6 pb-3 sm:pb-6">
        {actions.map((action) => (
          <Button
            key={action.key}
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs sm:text-sm"
            onClick={() => onAction(action.key)}
          >
            <action.icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="truncate">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};