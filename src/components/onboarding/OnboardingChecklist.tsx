import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Trophy,
  Zap,
  X,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTaskAutoDetection } from '@/hooks/useTaskAutoDetection';

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  actionUrl?: string;
  actionLabel?: string;
  icon: React.ReactNode;
  category: 'essential' | 'recommended' | 'advanced';
}

interface OnboardingProgress {
  tasks_completed: string[];
  total_points: number;
  completed_at?: string;
  dismissed?: boolean;
}

export const OnboardingChecklist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [progress, setProgress] = useState<OnboardingProgress>({
    tasks_completed: [],
    total_points: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Define onboarding tasks
  const tasks: OnboardingTask[] = [
    {
      id: 'complete_profile',
      title: 'Complete Your Profile',
      description: 'Add your name and company details',
      points: 10,
      completed: false,
      actionUrl: '/user-settings',
      actionLabel: 'Complete Profile',
      icon: <Sparkles className="h-4 w-4" />,
      category: 'essential',
    },
    {
      id: 'create_first_project',
      title: 'Create Your First Project',
      description: 'Start tracking time and costs on a real project',
      points: 25,
      completed: false,
      actionUrl: '/create-project',
      actionLabel: 'Create Project',
      icon: <Zap className="h-4 w-4" />,
      category: 'essential',
    },
    {
      id: 'log_time_entry',
      title: 'Log Your First Time Entry',
      description: 'Track crew hours to see real-time job costing',
      points: 20,
      completed: false,
      actionUrl: '/time-tracking',
      actionLabel: 'Log Time',
      icon: <Zap className="h-4 w-4" />,
      category: 'essential',
    },
    {
      id: 'upload_document',
      title: 'Upload a Document',
      description: 'Store plans, contracts, or photos',
      points: 15,
      completed: false,
      actionUrl: '/documents',
      actionLabel: 'Upload Document',
      icon: <Sparkles className="h-4 w-4" />,
      category: 'recommended',
    },
    {
      id: 'invite_team_member',
      title: 'Invite a Team Member',
      description: 'Collaborate with your crew or office staff',
      points: 20,
      completed: false,
      actionUrl: '/people-hub',
      actionLabel: 'Invite Team',
      icon: <Zap className="h-4 w-4" />,
      category: 'recommended',
    },
    {
      id: 'create_daily_report',
      title: 'Create a Daily Report',
      description: 'Document progress and share updates',
      points: 15,
      completed: false,
      actionUrl: '/daily-reports',
      actionLabel: 'Create Report',
      icon: <Sparkles className="h-4 w-4" />,
      category: 'recommended',
    },
    {
      id: 'connect_quickbooks',
      title: 'Connect QuickBooks',
      description: 'Sync financial data automatically',
      points: 30,
      completed: false,
      actionUrl: '/integrations',
      actionLabel: 'Connect QuickBooks',
      icon: <Trophy className="h-4 w-4" />,
      category: 'advanced',
    },
    {
      id: 'create_change_order',
      title: 'Create a Change Order',
      description: 'Track scope changes and additional costs',
      points: 15,
      completed: false,
      actionUrl: '/change-orders',
      actionLabel: 'Create Change Order',
      icon: <Sparkles className="h-4 w-4" />,
      category: 'advanced',
    },
    {
      id: 'generate_report',
      title: 'Generate a Financial Report',
      description: 'View job costing and profitability insights',
      points: 20,
      completed: false,
      actionUrl: '/reports',
      actionLabel: 'View Reports',
      icon: <Trophy className="h-4 w-4" />,
      category: 'advanced',
    },
  ];

  // Calculate progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => progress.tasks_completed.includes(t.id)).length;
  const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
  const maxPoints = tasks.reduce((sum, task) => sum + task.points, 0);

  // Update task completion status
  const tasksWithStatus = tasks.map(task => ({
    ...task,
    completed: progress.tasks_completed.includes(task.id),
  }));

  // Categorize tasks
  const essentialTasks = tasksWithStatus.filter(t => t.category === 'essential');
  const recommendedTasks = tasksWithStatus.filter(t => t.category === 'recommended');
  const advancedTasks = tasksWithStatus.filter(t => t.category === 'advanced');

  // Load progress from database
  useEffect(() => {
    if (!user) return;

    const loadProgress = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('onboarding_progress')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setProgress(data);
          setIsDismissed(data.dismissed || false);
        }
      } catch (error) {
        console.error('Failed to load onboarding progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [user]);

  // Mark task as complete
  const completeTask = async (taskId: string, points: number) => {
    if (!user || progress.tasks_completed.includes(taskId)) return;

    const newTasksCompleted = [...progress.tasks_completed, taskId];
    const newTotalPoints = progress.total_points + points;

    try {
      const { error } = await (supabase as any)
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          tasks_completed: newTasksCompleted,
          total_points: newTotalPoints,
          completed_at: newTasksCompleted.length === totalTasks ? new Date().toISOString() : null,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setProgress({
        tasks_completed: newTasksCompleted,
        total_points: newTotalPoints,
      });

      // Show success toast
      toast({
        title: "Task Completed! 🎉",
        description: `You earned ${points} points! Keep going!`,
      });

      // Check if all tasks are complete
      if (newTasksCompleted.length === totalTasks) {
        toast({
          title: "Onboarding Complete! 🏆",
          description: `You've earned all ${maxPoints} points! You're a BuildDesk pro!`,
        });
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  // Dismiss checklist
  const dismissChecklist = async () => {
    if (!user) return;

    try {
      await (supabase as any)
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          tasks_completed: progress.tasks_completed,
          total_points: progress.total_points,
          dismissed: true,
        }, { onConflict: 'user_id' });

      setIsDismissed(true);
    } catch (error) {
      console.error('Failed to dismiss checklist:', error);
    }
  };

  // Auto-detect task completion
  useTaskAutoDetection(progress, completeTask);

  if (isLoading || isDismissed) return null;

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="shadow-lg"
          size="lg"
        >
          <Trophy className="mr-2 h-5 w-5" />
          {completedTasks}/{totalTasks} Tasks Complete
        </Button>
      </div>
    );
  }

  // Full checklist view
  return (
    <Card className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] shadow-2xl z-50 border-construction-orange">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-construction-orange" />
              Getting Started
              {completedTasks === totalTasks && (
                <Badge className="bg-green-500 text-white">Completed!</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Complete tasks to unlock BuildDesk's full potential
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMinimized(true)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={dismissChecklist}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{progress.total_points} / {maxPoints} points</span>
            <span className="text-muted-foreground">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="max-h-[60vh] overflow-y-auto space-y-4">
        {/* Essential Tasks */}
        {essentialTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-construction-orange mb-2">
              Essential Tasks
            </h4>
            <div className="space-y-2">
              {essentialTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={() => completeTask(task.id, task.points)}
                  onNavigate={(url) => {
                    if (url) navigate(url);
                    setIsMinimized(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recommended Tasks */}
        {recommendedTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
              Recommended
            </h4>
            <div className="space-y-2">
              {recommendedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={() => completeTask(task.id, task.points)}
                  onNavigate={(url) => {
                    if (url) navigate(url);
                    setIsMinimized(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Advanced Tasks */}
        {advancedTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
              Advanced
            </h4>
            <div className="space-y-2">
              {advancedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={() => completeTask(task.id, task.points)}
                  onNavigate={(url) => {
                    if (url) navigate(url);
                    setIsMinimized(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Individual Task Item Component
interface TaskItemProps {
  task: OnboardingTask;
  onComplete: () => void;
  onNavigate: (url?: string) => void;
}

const TaskItem = ({ task, onComplete, onNavigate }: TaskItemProps) => {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
        task.completed
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200 hover:border-construction-orange hover:shadow-sm'
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {task.completed ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-gray-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h5 className={`text-sm font-medium ${task.completed ? 'text-green-900 line-through' : 'text-construction-dark'}`}>
              {task.title}
            </h5>
            <p className={`text-xs mt-0.5 ${task.completed ? 'text-green-700' : 'text-muted-foreground'}`}>
              {task.description}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {task.points}pts
          </Badge>
        </div>

        {!task.completed && task.actionUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 text-xs px-2 text-construction-orange hover:text-construction-orange hover:bg-construction-orange/10"
            onClick={() => onNavigate(task.actionUrl)}
          >
            {task.actionLabel}
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default OnboardingChecklist;
