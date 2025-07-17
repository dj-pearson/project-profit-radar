import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, User, Building, MessageSquare, Paperclip, CheckSquare, Timer, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaskComments } from './TaskComments';
import { TaskAttachments } from './TaskAttachments';
import { TaskSubtasks } from './TaskSubtasks';
import { TaskTimeTracking } from './TaskTimeTracking';
import { TaskActivityLog } from './TaskActivityLog';
import { TaskTags } from './TaskTags';

interface Task {
  id: string;
  name: string;
  description?: string;
  status: string;
  category: string;
  priority: string;
  due_date?: string;
  estimated_hours?: number;
  assigned_to?: string;
  company_id: string;
  project_id: string;
  tags?: string[];
  project?: { name: string };
  assigned_user?: { first_name: string; last_name: string };
  created_at: string;
  updated_at: string;
}

interface TaskDetailViewProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
}

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const STATUS_COLORS = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800'
};

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated
}) => {
  const { userProfile } = useAuth();
  const [taskData, setTaskData] = useState<Task | null>(null);

  useEffect(() => {
    if (task) {
      setTaskData(task);
    }
  }, [task]);

  const handleTaskUpdate = (updatedTask: Task) => {
    setTaskData(updatedTask);
    onTaskUpdated(updatedTask);
  };

  if (!taskData) return null;

  const isOverdue = taskData.due_date && new Date(taskData.due_date) < new Date() && taskData.status !== 'completed';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{taskData.name}</span>
            <Badge className={STATUS_COLORS[taskData.status as keyof typeof STATUS_COLORS]}>
              {taskData.status.replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Task Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Task Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={PRIORITY_COLORS[taskData.priority as keyof typeof PRIORITY_COLORS]}>
                      {taskData.priority} priority
                    </Badge>
                    <Badge variant="outline">{taskData.category.replace('_', ' ')}</Badge>
                    {isOverdue && (
                      <Badge variant="destructive">Overdue</Badge>
                    )}
                  </div>

                  {taskData.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {taskData.description}
                      </p>
                    </div>
                  )}

                  <TaskTags
                    taskId={taskData.id}
                    initialTags={taskData.tags || []}
                    onTagsUpdate={(tags) => handleTaskUpdate({ ...taskData, tags })}
                  />
                </CardContent>
              </Card>

              {/* Tabs for different sections */}
              <Tabs defaultValue="comments" className="flex-1">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="comments" className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="subtasks" className="flex items-center gap-1">
                    <CheckSquare className="h-3 w-3" />
                    Subtasks
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="time" className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    Time
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="mt-4">
                  <TaskComments taskId={taskData.id} />
                </TabsContent>

                <TabsContent value="subtasks" className="mt-4">
                  <TaskSubtasks
                    taskId={taskData.id}
                    onSubtaskUpdate={() => {
                      // Refresh task data if needed
                    }}
                  />
                </TabsContent>

                <TabsContent value="attachments" className="mt-4">
                  <TaskAttachments taskId={taskData.id} />
                </TabsContent>

                <TabsContent value="time" className="mt-4">
                  <TaskTimeTracking taskId={taskData.id} />
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <TaskActivityLog taskId={taskData.id} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Task Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {taskData.project && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Project:</span>
                      <span className="truncate">{taskData.project.name}</span>
                    </div>
                  )}

                  {taskData.assigned_user && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Assigned to:</span>
                      <span>{taskData.assigned_user.first_name} {taskData.assigned_user.last_name}</span>
                    </div>
                  )}

                  {taskData.due_date && (
                    <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-600' : ''}`}>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Due date:</span>
                      <span>{format(new Date(taskData.due_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}

                  {taskData.estimated_hours && taskData.estimated_hours > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Estimated:</span>
                      <span>{taskData.estimated_hours}h</span>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <div>Created: {format(new Date(taskData.created_at), 'MMM d, yyyy')}</div>
                    <div>Updated: {format(new Date(taskData.updated_at), 'MMM d, yyyy')}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {taskData.status !== 'completed' && (
                    <Button
                      className="w-full"
                      onClick={async () => {
                        const { data } = await supabase
                          .from('tasks')
                          .update({ status: 'completed' })
                          .eq('id', taskData.id)
                          .select()
                          .single();
                        
                        if (data) {
                          handleTaskUpdate({ ...taskData, status: 'completed' });
                        }
                      }}
                    >
                      Mark Complete
                    </Button>
                  )}
                  
                  {taskData.status === 'completed' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        const { data } = await supabase
                          .from('tasks')
                          .update({ status: 'todo' })
                          .eq('id', taskData.id)
                          .select()
                          .single();
                        
                        if (data) {
                          handleTaskUpdate({ ...taskData, status: 'todo' });
                        }
                      }}
                    >
                      Reopen Task
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};