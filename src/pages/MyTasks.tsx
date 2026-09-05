import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useMyTasks, useTasksCreatedByMe, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedProjects } from '@/hooks/useOptimizedQueries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MyScheduledWork } from '@/components/schedule/MyScheduledWork';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-spinner';
import { TaskWithDetails } from '@/services/taskService';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
// Accessible components
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import {
  AccessibleForm,
  AccessibleFormField,
  AccessibleTextarea,
  AccessibleSelect,
} from '@/components/accessibility/AccessibleForm';
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

  // Form state for create dialog
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    project_id: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});

  // Queries
  const assignedTasksQuery = useMyTasks(statusFilter.length > 0 ? statusFilter : undefined);
  const createdTasksQuery = useTasksCreatedByMe(statusFilter.length > 0 ? statusFilter : undefined);
  const projectsQuery = useOptimizedProjects();
  const projects = projectsQuery.data || [];

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
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" aria-hidden="true" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />;
      default: return <Circle className="h-4 w-4 text-gray-400" aria-hidden="true" />;
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

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'cancelled': return 'Cancelled';
      case 'open': return 'Open';
      default: return 'Open';
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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const errors: Record<string, string | undefined> = {};
    if (!formData.name.trim()) {
      errors.name = 'Task title is required';
    }
    if (!formData.project_id) {
      errors.project_id = 'Please select a project';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    createTask.mutate({
      name: formData.name,
      description: formData.description || undefined,
      project_id: formData.project_id,
      priority: formData.priority,
      assigned_to: userProfile?.id || '',
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
      due_date: formData.due_date || undefined,
    });
    setCreateDialogOpen(false);
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      due_date: '',
      estimated_hours: '',
      project_id: ''
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      due_date: '',
      estimated_hours: '',
      project_id: ''
    });
    setFormErrors({});
  };

  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    resetForm();
  };

  // Project options for select
  const projectOptions = projects.map(p => ({ value: p.id, label: p.name }));

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const TaskCard = ({ task }: { task: TaskWithDetails }) => (
    <Card className="mb-4" role="article" aria-labelledby={`task-title-${task.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(task.status)}
              <h3 id={`task-title-${task.id}`} className="font-semibold text-lg">
                {task.name}
              </h3>
              {task.priority && (
                <Badge variant={getPriorityColor(task.priority)} aria-label={`Priority: ${task.priority}`}>
                  {task.priority}
                </Badge>
              )}
              <Badge variant={getStatusColor(task.status)} aria-label={`Status: ${getStatusLabel(task.status)}`}>
                {getStatusLabel(task.status)}
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
                  <Tag className="h-3 w-3" aria-hidden="true" />
                  <span aria-label={`Project: ${task.project_name}`}>{task.project_name}</span>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  <span aria-label={`Due date: ${new Date(task.due_date).toLocaleDateString()}`}>
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" aria-hidden="true" />
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
              <Button variant="ghost" size="sm" aria-label={`Actions for task: ${task.name}`}>
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
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
                <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleStatusChange(task.id, 'in_progress')}
                disabled={task.status === 'in_progress'}
              >
                <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
                Mark In Progress
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange(task.id, 'completed')}
                disabled={task.status === 'completed'}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Mark Complete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteTask(task.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2" role="list" aria-label="Task tags">
            {task.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs" role="listitem">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const assignedTasks = assignedTasksQuery.data || [];
  const createdTasks = createdTasksQuery.data || [];
  const isLoading = assignedTasksQuery.isLoading || createdTasksQuery.isLoading;

  return (
    <DashboardLayout title="My Tasks">
      <div className="space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 id="page-heading" className="text-2xl font-bold">My Tasks</h1>
            <p className="text-muted-foreground">All your assignments in one place</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} aria-describedby="page-heading">
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add Task
          </Button>
        </header>

        {/* Filters */}
        <div className="flex items-center gap-4" role="search" aria-label="Filter tasks">
          <div className="relative flex-1 max-w-sm">
            <Label htmlFor="task-search" className="sr-only">Search tasks</Label>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" aria-hidden="true" />
            <Input
              id="task-search"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search tasks by name or description"
            />
          </div>

          <div>
            <Label htmlFor="status-filter" className="sr-only">Filter by status</Label>
            <Select
              value={statusFilter[0] ?? 'all'}
              onValueChange={(value) => setStatusFilter(value === 'all' ? [] : [value])}
            >
              <SelectTrigger className="w-48" id="status-filter" aria-label="Filter by status">
                <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
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
        </div>

        {/* Task Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2" aria-label="Task views">
            <TabsTrigger value="assigned" aria-controls="assigned-panel">
              Assigned to Me ({assignedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="created" aria-controls="created-panel">
              Created by Me ({createdTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" id="assigned-panel" className="space-y-4" role="tabpanel" aria-labelledby="assigned-tab">
            {isLoading ? (
              <LoadingState message="Loading your tasks..." />
            ) : filteredTasks(assignedTasks).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Circle className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
                  <h3 className="text-lg font-semibold mb-2">No tasks assigned</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No tasks match your search criteria.' : 'You have no tasks assigned to you yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div role="feed" aria-label="Tasks assigned to you" aria-busy={isLoading}>
                {filteredTasks(assignedTasks).map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}

            {/* US-329: `tasks` is the to-do list; schedule_tasks is the dated
                work on the Gantt. A crew member has both and only ever saw one. */}
            <MyScheduledWork />
          </TabsContent>

          <TabsContent value="created" id="created-panel" className="space-y-4" role="tabpanel" aria-labelledby="created-tab">
            {isLoading ? (
              <LoadingState message="Loading created tasks..." />
            ) : filteredTasks(createdTasks).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
                  <h3 className="text-lg font-semibold mb-2">No tasks created</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No tasks match your search criteria.' : 'You haven\'t created any tasks yet.'}
                  </p>
                  <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Create Your First Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div role="feed" aria-label="Tasks created by you" aria-busy={isLoading}>
                {filteredTasks(createdTasks).map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Accessible Create Task Modal */}
        <AccessibleModal
          isOpen={createDialogOpen}
          onClose={handleCloseDialog}
          title="Create New Task"
          description="Create a new task and assign it to yourself or a team member."
          size="md"
          footer={
            <>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-task-form"
                disabled={createTask.isPending || projects.length === 0}
              >
                {createTask.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </>
          }
        >
          <AccessibleForm
            onSubmit={handleCreateSubmit}
            ariaLabel="Create new task form"
            initialErrors={formErrors}
            className="space-y-4"
          >
            <div id="create-task-form">
              <AccessibleFormField
                name="name"
                label="Task Title"
                required
                placeholder="Enter task title"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
              />

              <AccessibleSelect
                name="project_id"
                label="Project"
                required
                options={projectOptions}
                placeholder="Select a project"
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                error={formErrors.project_id}
                helpText={projects.length === 0 ? "No projects available. Create a project first." : undefined}
              />

              <AccessibleTextarea
                name="description"
                label="Description"
                placeholder="Enter task description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />

              <div className="grid grid-cols-2 gap-4">
                <AccessibleSelect
                  name="priority"
                  label="Priority"
                  options={priorityOptions}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                />

                <AccessibleFormField
                  name="due_date"
                  label="Due Date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <AccessibleFormField
                name="estimated_hours"
                label="Estimated Hours"
                type="number"
                step={0.5}
                min={0}
                placeholder="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                helpText="Estimated time to complete the task"
              />
            </div>
          </AccessibleForm>
        </AccessibleModal>

        {selectedTask && (
          <EditTaskDialog
            task={selectedTask}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setSelectedTask(null);
            }}
            onTaskUpdated={() => {
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
