import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Building2, 
  Users, 
  FileText, 
  Target,
  DollarSign,
  TrendingUp,
  Clock
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'outline';
  priority: 'high' | 'medium' | 'low';
}

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  
  const quickActions: QuickAction[] = [
    {
      title: 'Add New Lead',
      description: 'Start your sales funnel',
      icon: Users,
      onClick: () => navigate('/crm/leads?action=new'),
      variant: 'default',
      priority: 'high'
    },
    {
      title: 'Create Project',
      description: 'From won opportunity',
      icon: Building2,
      onClick: () => navigate('/create-project'),
      priority: 'high'
    },
    {
      title: 'Review Pipeline',
      description: 'Check opportunities',
      icon: Target,
      onClick: () => navigate('/crm/opportunities'),
      priority: 'medium'
    },
    {
      title: 'New Estimate',
      description: 'Price a project',
      icon: FileText,
      onClick: () => navigate('/estimates?action=new'),
      priority: 'medium'
    },
    {
      title: 'View Reports',
      description: 'Business insights',
      icon: TrendingUp,
      onClick: () => navigate('/reports'),
      priority: 'low'
    },
    {
      title: 'Check Tasks',
      description: 'Daily follow-ups',
      icon: Clock,
      onClick: () => navigate('/my-tasks'),
      priority: 'medium'
    }
  ];

  // Sort by priority and show top 4
  const topActions = quickActions
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 4);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Plus className="h-5 w-5 mr-2 text-primary" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Jump directly to common tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {topActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              className="h-auto p-4 flex flex-col items-center text-center space-y-2"
              onClick={action.onClick}
            >
              <action.icon className="h-6 w-6" />
              <div>
                <p className="font-medium text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};