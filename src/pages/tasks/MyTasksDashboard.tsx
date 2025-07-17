import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  User, 
  Building, 
  Filter, 
  CheckSquare,
  AlertTriangle,
  FileText,
  Users,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  Kanban
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isTomorrow, isThisWeek, isPast } from 'date-fns';

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  assigned_to?: string;
  source: 'task' | 'rfi' | 'permit' | 'contact';
  source_data: {
    project_name?: string;
    category?: string;
    type?: string;
  };
  assigned_user?: { first_name: string; last_name: string } | null;
}

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', 
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

const SOURCE_ICONS = {
  task: CheckSquare,
  rfi: AlertTriangle,
  permit: FileText,
  contact: Users
};

export const MyTasksDashboard = () => {
  const { userProfile } = useAuth();
  const [items, setItems] = useState<TaskItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dueDateFilter, setDueDateFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'kanban'>('cards');

  useEffect(() => {
    loadAllItems();
  }, [userProfile]);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, sourceFilter, priorityFilter, statusFilter, dueDateFilter]);

  const loadAllItems = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      const allItems: TaskItem[] = [];

      // Load tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          description,
          status,
          priority,
          due_date,
          assigned_to,
          category,
          project:projects(name)
        `)
        .eq('assigned_to', userProfile.id)
        .neq('status', 'completed');

      if (tasks) {
        tasks.forEach(task => {
          allItems.push({
            id: task.id,
            title: task.name,
            description: task.description,
            status: task.status,
            priority: task.priority || 'medium',
            due_date: task.due_date,
            assigned_to: task.assigned_to,
            source: 'task',
            source_data: {
              project_name: task.project?.name,
              category: task.category
            }
          });
        });
      }

      // Load permits with upcoming deadlines (if they exist in your schema)
      // This is an example - adjust based on your actual permit structure
      // const { data: permits } = await supabase
      //   .from('permits')
      //   .select('id, name, expiry_date, status, assigned_to')
      //   .eq('assigned_to', userProfile.id)
      //   .gte('expiry_date', new Date().toISOString())
      //   .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

      // Load contacts that need follow-up
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, next_contact_date, assigned_to, relationship_status')
        .eq('assigned_to', userProfile.id)
        .eq('relationship_status', 'active')
        .not('next_contact_date', 'is', null)
        .gte('next_contact_date', new Date().toISOString().split('T')[0]);

      if (contacts) {
        contacts.forEach(contact => {
          allItems.push({
            id: contact.id,
            title: `Follow up with ${contact.first_name} ${contact.last_name}`,
            status: 'pending',
            priority: 'medium',
            due_date: contact.next_contact_date,
            assigned_to: contact.assigned_to,
            source: 'contact',
            source_data: {
              type: 'follow_up'
            }
          });
        });
      }

      // Get user info for assigned users
      const userIds = [...new Set(allItems.map(item => item.assigned_to).filter(Boolean))];
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

      // Add user info to items
      const itemsWithUsers = allItems.map(item => ({
        ...item,
        assigned_user: item.assigned_to ? usersMap[item.assigned_to] || null : null
      }));

      setItems(itemsWithUsers);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...items];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(item => item.source === sourceFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === priorityFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Due date filter
    if (dueDateFilter !== 'all' && dueDateFilter !== '') {
      const now = new Date();
      filtered = filtered.filter(item => {
        if (!item.due_date) return dueDateFilter === 'no_date';
        const dueDate = new Date(item.due_date);
        
        switch (dueDateFilter) {
          case 'overdue':
            return isPast(dueDate) && !isToday(dueDate);
          case 'today':
            return isToday(dueDate);
          case 'tomorrow':
            return isTomorrow(dueDate);
          case 'this_week':
            return isThisWeek(dueDate);
          case 'no_date':
            return false;
          default:
            return true;
        }
      });
    }

    // Sort by due date and priority
    filtered.sort((a, b) => {
      // First, sort by due date (overdue items first)
      if (a.due_date && b.due_date) {
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        return dateA.getTime() - dateB.getTime();
      }
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      
      // Then by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });

    setFilteredItems(filtered);
  };

  const getDueDateBadge = (due_date?: string) => {
    if (!due_date) return null;
    
    const dueDate = new Date(due_date);
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (isToday(dueDate)) {
      return <Badge variant="default">Due Today</Badge>;
    }
    if (isTomorrow(dueDate)) {
      return <Badge variant="secondary">Due Tomorrow</Badge>;
    }
    if (isThisWeek(dueDate)) {
      return <Badge variant="outline">This Week</Badge>;
    }
    
    return <Badge variant="outline">{format(dueDate, 'MMM d')}</Badge>;
  };

  const getItemsByStatus = (status: string) => {
    return filteredItems.filter(item => item.status === status);
  };

  const renderItemCard = (item: TaskItem) => {
    const SourceIcon = SOURCE_ICONS[item.source];
    
    return (
      <Card key={item.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <SourceIcon className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">
                {item.source.toUpperCase()}
              </Badge>
            </div>
            <Badge className={PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS]}>
              {item.priority}
            </Badge>
          </div>
          
          <h4 className="font-medium text-sm mb-1">{item.title}</h4>
          {item.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.source_data.project_name && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building className="h-3 w-3" />
                  {item.source_data.project_name}
                </div>
              )}
            </div>
            {getDueDateBadge(item.due_date)}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <DashboardLayout title="My Tasks Dashboard">
        <div className="text-center py-8">Loading your tasks...</div>
      </DashboardLayout>
    );
  }

  const overdueTasks = filteredItems.filter(item => item.due_date && isPast(new Date(item.due_date)) && !isToday(new Date(item.due_date)));
  const dueTodayTasks = filteredItems.filter(item => item.due_date && isToday(new Date(item.due_date)));
  const dueTomorrowTasks = filteredItems.filter(item => item.due_date && isTomorrow(new Date(item.due_date)));

  return (
    <DashboardLayout title="My Tasks Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Due Today</p>
                  <p className="text-2xl font-bold text-orange-600">{dueTodayTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Due Tomorrow</p>
                  <p className="text-2xl font-bold text-blue-600">{dueTomorrowTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Total Active</p>
                  <p className="text-2xl font-bold text-green-600">{filteredItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="rfi">RFIs</SelectItem>
                  <SelectItem value="permit">Permits</SelectItem>
                  <SelectItem value="contact">Contacts</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Due Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Due Today</SelectItem>
                  <SelectItem value="tomorrow">Due Tomorrow</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="no_date">No Due Date</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                >
                  <Kanban className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(renderItemCard)}
          </div>
        )}

        {viewMode === 'list' && (
          <Card>
            <CardContent className="p-0">
              <div className="space-y-1">
                {filteredItems.map(item => {
                  const SourceIcon = SOURCE_ICONS[item.source];
                  return (
                    <div key={item.id} className="border-b p-4 hover:bg-accent/50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <SourceIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{item.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.source.toUpperCase()}
                            </Badge>
                            <Badge className={PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS]}>
                              {item.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {item.source_data.project_name && (
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {item.source_data.project_name}
                              </div>
                            )}
                            {item.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(item.due_date), 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getDueDateBadge(item.due_date)}
                          <Badge variant="outline" className="capitalize">
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['todo', 'in_progress', 'pending', 'on_hold'].map(status => (
              <Card key={status}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium capitalize flex items-center justify-between">
                    {status.replace('_', ' ')}
                    <Badge variant="outline">{getItemsByStatus(status).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getItemsByStatus(status).map(renderItemCard)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredItems.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No tasks found</p>
              <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};