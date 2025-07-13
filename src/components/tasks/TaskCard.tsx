import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Calendar, Clock, User, Building, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { EditTaskDialog } from './EditTaskDialog';

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
  project?: { name: string };
  assigned_user?: { first_name: string; last_name: string };
}

interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
  showProject?: boolean;
}

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200'
};

const STATUS_COLORS = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800'
};

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onUpdate, 
  onDelete, 
  showProject = false 
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const getCategoryBadgeVariant = (category: string) => {
    const categoryColors: Record<string, string> = {
      permit: 'bg-purple-100 text-purple-800',
      estimate: 'bg-green-100 text-green-800',
      inspection: 'bg-blue-100 text-blue-800',
      safety: 'bg-red-100 text-red-800',
      financial: 'bg-yellow-100 text-yellow-800'
    };
    
    return categoryColors[category] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      onDelete(task.id);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { data } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id)
        .select()
        .single();

      if (data) {
        onUpdate({ ...task, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{task.name}</h4>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  console.log("TaskCard: Edit clicked for task:", task.id, "isMobile:", /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
                  setIsEditOpen(true);
                }}>
                  <Edit className="h-3 w-3 mr-2" />
                  Edit
                </DropdownMenuItem>
                {task.status !== 'completed' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                    Complete
                  </DropdownMenuItem>
                )}
                {task.status === 'completed' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('todo')}>
                    Reopen
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            <Badge className={getCategoryBadgeVariant(task.category)} variant="outline">
              {task.category.replace('_', ' ')}
            </Badge>
            <Badge className={PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]} variant="outline">
              {task.priority}
            </Badge>
            {showProject && (
              <Badge className={STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]} variant="outline">
                {task.status.replace('_', ' ')}
              </Badge>
            )}
          </div>

          {/* Meta Information */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {showProject && task.project && (
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                <span className="truncate">{task.project.name}</span>
              </div>
            )}
            
            {task.assigned_user && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{task.assigned_user.first_name} {task.assigned_user.last_name}</span>
              </div>
            )}
            
            {task.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            
            {task.estimated_hours && task.estimated_hours > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{task.estimated_hours}h estimated</span>
              </div>
            )}
          </div>

          {/* Quick Status Actions */}
          {!showProject && (
            <div className="flex gap-1">
              {['todo', 'in_progress', 'completed'].map(status => (
                <Button
                  key={status}
                  variant={task.status === status ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs px-2 py-1 h-auto"
                  onClick={() => handleStatusChange(status)}
                >
                  {status.replace('_', ' ')}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditTaskDialog
        task={task}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onTaskUpdated={onUpdate}
      />
    </>
  );
};