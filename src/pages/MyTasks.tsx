import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useMyTasks, useTasksCreatedByMe, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-spinner';
import { TaskWithDetails } from '@/services/taskService';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Circle,
  AlertCircle,
  Trash2,
  Edit,
  MessageSquare,
  Tag,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MyTasks = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('assigned');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);

  // Queries
  const assignedTasksQuery = useMyTasks(statusFilter.length > 0 ? statusFilter : undefined);
  const createdTasksQuery = useTasksCreatedByMe(statusFilter.length > 0 ? statusFilter : undefined);

  // Mutations
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'secondary';
      case 'in_progress': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTask.mutate({
      id: taskId,
      updates: { status: newStatus }
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate(taskId);
    }
  };

  const filteredTasks = (tasks: TaskWithDetails[]) => {
    if (!searchQuery) return tasks;
    return tasks.filter(task => 
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const TaskCard = ({ task }: { task: TaskWithDetails }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(task.status)}
              <h3 className="font-semibold text-lg">{task.name}</h3>
              {task.priority && (
                <Badge variant={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              )}
              <Badge variant={getStatusColor(task.status)}>
                {task.status?.replace('_', ' ') || 'open'}
              </Badge>
            </div>
            {task.description && (
              <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {task.project_name && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {task.project_name}
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </div>
              )}
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {activeTab === 'assigned' ? 'Created by' : 'Assigned to'}: {
                  activeTab === 'assigned'
                    ? task.created_by_profile 
                      ? `${task.created_by_profile.first_name || ''} ${task.created_by_profile.last_name || ''}`.trim() || 'Unknown'
                      : 'Unknown'
                    : task.assigned_to_profile 
                      ? `${task.assigned_to_profile.first_name || ''} ${task.assigned_to_profile.last_name || ''}`.trim() || 'Unassigned'
                      : 'Unassigned'
                }
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTask(task);
                  setEditDialogOpen(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleStatusChange(task.id, 'in_progress')}
                disabled={task.status === 'in_progress'}
              >
                <Clock className="h-4 w-4 mr-2" />
                Mark In Progress
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange(task.id, 'completed')}
                disabled={task.status === 'completed'}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Complete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteTask(task.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const CreateTaskDialog = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      priority: 'medium' as const,
      due_date: '',
      estimated_hours: '',
      assigned_to: userProfile?.id || '',
      project_id: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      createTask.mutate({
        ...formData,
        assigned_to: formData.assigned_to || userProfile?.id || '',
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
        due_date: formData.due_date || undefined,
        project_id: formData.project_id || undefined
      });
      setCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        priority: 'medium',
        due_date: '',
        estimated_hours: '',
        assigned_to: userProfile?.id || '',
        project_id: ''
      });
    };

    return (
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Create a new task and assign it to yourself or a team member.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Title *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter task title"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="estimated_hours">Estimated Hours</Label>
              <Input
                id="estimated_hours"
                type="number"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  const assignedTasks = assignedTasksQuery.data || [];
  const createdTasks = createdTasksQuery.data || [];
  const isLoading = assignedTasksQuery.isLoading || createdTasksQuery.isLoading;

  return (
    <DashboardLayout title="My Tasks">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Tasks</h1>
            <p className="text-muted-foreground">All your assignments in one place</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select
            value={statusFilter[0] ?? 'all'}
            onValueChange={(value) => setStatusFilter(value === 'all' ? [] : [value])}
          >
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assigned">
              Assigned to Me ({assignedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="created">
              Created by Me ({createdTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="space-y-4">
            {isLoading ? (
              <LoadingState message="Loading your tasks..." />
            ) : filteredTasks(assignedTasks).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Circle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tasks assigned</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No tasks match your search criteria.' : 'You have no tasks assigned to you yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTasks(assignedTasks).map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </TabsContent>

          <TabsContent value="created" className="space-y-4">
            {isLoading ? (
              <LoadingState message="Loading created tasks..." />
            ) : filteredTasks(createdTasks).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tasks created</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No tasks match your search criteria.' : 'You haven\'t created any tasks yet.'}
                  </p>
                  <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredTasks(createdTasks).map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </TabsContent>
        </Tabs>

        <CreateTaskDialog />
        
        {selectedTask && (
          <EditTaskDialog
            task={selectedTask}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setSelectedTask(null);
            }}
            onTaskUpdated={(updatedTask) => {
              // Refetch queries to get updated data
              assignedTasksQuery.refetch();
              createdTasksQuery.refetch();
              setEditDialogOpen(false);
              setSelectedTask(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyTasks;