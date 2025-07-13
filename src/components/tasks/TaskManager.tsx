import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Filter, Plus, Calendar, Clock, User, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskTemplatesDialog } from './TaskTemplatesDialog';
import { format } from 'date-fns';

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
  assigned_user?: { first_name: string; last_name: string } | null;
}

const TASK_CATEGORIES = [
  'general',
  'permit',
  'estimate', 
  'inspection',
  'material_order',
  'labor',
  'safety',
  'quality_control',
  'client_communication',
  'documentation',
  'financial',
  'equipment'
];

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800', 
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export const TaskManager = () => {
  const { userProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'all' | 'my-tasks'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [userProfile]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchTerm, categoryFilter, priorityFilter, statusFilter, viewMode]);

  const loadTasks = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Get user info separately for assigned users
      const userIds = [...new Set((data || []).map(task => task.assigned_to).filter(Boolean))];
      let usersMap: Record<string, { first_name: string; last_name: string }> = {};
      
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);
        
        usersMap = (users || []).reduce((acc, user) => ({
          ...acc,
          [user.id]: { first_name: user.first_name, last_name: user.last_name }
        }), {});
      }

      const tasksWithUsers: Task[] = (data || []).map(task => ({
        ...task,
        assigned_user: task.assigned_to ? usersMap[task.assigned_to] || null : null
      }));

      setTasks(tasksWithUsers);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // View mode filter
    if (viewMode === 'my-tasks') {
      filtered = filtered.filter(task => task.assigned_to === userProfile?.id);
    }

    setFilteredTasks(filtered);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

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

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Task Management</h2>
          <Badge variant="outline">{filteredTasks.length} tasks</Badge>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsTemplatesOpen(true)} variant="outline">
            <Building className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TASK_CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>

            <Select value={viewMode} onValueChange={(value: 'all' | 'my-tasks') => setViewMode(value)}>
              <SelectTrigger>
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="my-tasks">My Tasks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task Views */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="due-date">Due Date View</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['todo', 'in_progress', 'completed', 'on_hold'].map(status => (
              <Card key={status}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium capitalize flex items-center justify-between">
                    {status.replace('_', ' ')}
                    <Badge variant="outline">{getTasksByStatus(status).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getTasksByStatus(status).map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onUpdate={handleTaskUpdate}
                      onDelete={handleTaskDelete}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              <div className="space-y-1">
                {filteredTasks.map(task => (
                  <div key={task.id} className="border-b p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{task.name}</span>
                          <Badge className={getCategoryBadgeVariant(task.category)}>
                            {task.category.replace('_', ' ')}
                          </Badge>
                          <Badge className={PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}>
                            {task.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {task.project && (
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {task.project.name}
                            </div>
                          )}
                          {task.assigned_user && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.assigned_user.first_name} {task.assigned_user.last_name}
                            </div>
                          )}
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(task.due_date), 'MMM d, yyyy')}
                            </div>
                          )}
                          {task.estimated_hours && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {task.estimated_hours}h
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="due-date">
          <div className="space-y-4">
            {filteredTasks
              .sort((a, b) => {
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
              })
              .map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onUpdate={handleTaskUpdate}
                  onDelete={handleTaskDelete}
                  showProject
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateTaskDialog 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)}
        onTaskCreated={loadTasks}
      />
      
      <TaskTemplatesDialog 
        isOpen={isTemplatesOpen} 
        onClose={() => setIsTemplatesOpen(false)}
      />
    </div>
  );
};