import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Task {
  id: string;
  company_id: string;
  site_id: string;
  project_id: string;
  phase_id?: string | null;
  assigned_to: string | null;
  created_by: string | null;
  name: string;
  description?: string | null;
  status: string | null;
  priority: string | null;
  due_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  completion_percentage?: number | null;
  tags: string[] | null;
  category: string | null;
  dependencies: string[] | null;
  is_milestone?: boolean | null;
  is_critical_path?: boolean | null;
  duration_days?: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithDetails extends Task {
  project_name?: string;
  assigned_to_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  created_by_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface CreateTaskData {
  name: string;
  description?: string;
  assigned_to?: string;
  project_id: string;
  priority?: string;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  category?: 'general' | 'permit' | 'estimate' | 'inspection' | 'material_order' | 'labor' | 'safety' | 'quality_control' | 'client_communication' | 'documentation' | 'financial' | 'equipment';
}

export interface UpdateTaskData {
  name?: string;
  description?: string;
  assigned_to?: string;
  project_id?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  completion_percentage?: number;
  tags?: string[];
}

class TaskService {
  /**
   * Get tasks
   * @param filters - Optional filters for status, assigned_to, project_id, search
   */
  async getTasks(filters?: {
    status?: string[];
    assigned_to?: string;
    project_id?: string;
    search?: string;
  }): Promise<TaskWithDetails[]> {
    // Fetch tasks - use * to get all available columns dynamically
    // This avoids 400 errors if some columns don't exist in the database
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters?.search) {
      // Use 'or' filter for search - handle both 'name' and 'title' columns
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Error fetching tasks: ${error.message}`);
    }

    const tasks = (data || []) as any[];
    if (tasks.length === 0) return [];

    // Fetch project names separately
    const projectIds = Array.from(
      new Set(tasks.map(t => t.project_id).filter((v): v is string => !!v))
    );

    const projectsMap = new Map<string, string>();
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      if (projects) {
        for (const project of projects) {
          projectsMap.set(project.id, project.name);
        }
      }
    }

    // Fetch user profiles separately since there's no FK relationship
    const userIds = Array.from(
      new Set(
        tasks
          .flatMap(t => [t.assigned_to, t.created_by])
          .filter((v): v is string => !!v)
      )
    );

    const profilesMap = new Map<string, { first_name: string; last_name: string; email: string }>();

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (!profilesError && profiles) {
        for (const profile of profiles) {
          profilesMap.set(profile.id, profile);
        }
      }
    }

    // Transform the data to match TaskWithDetails interface
    // Handle both 'name' and 'title' column names for backwards compatibility
    return tasks.map((task: any) => ({
      ...task,
      name: task.name || task.title || 'Untitled Task',
      project_name: task.project_id ? projectsMap.get(task.project_id) || null : null,
      assigned_to_profile: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null,
      created_by_profile: task.created_by ? profilesMap.get(task.created_by) || null : null,
      tags: Array.isArray(task.tags) ? task.tags : [],
    }));
  }

  /**
   * Get a single task
   * @param id - Task ID
   */
  async getTask(id: string): Promise<TaskWithDetails | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error fetching task: ${error.message}`);
    }

    if (!data) return null;

    const task = data as Task;

    const projectPromise = task.project_id
      ? supabase.from('projects').select('id, name').eq('id', task.project_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as { data: any; error: null });

    const userIds = [task.assigned_to, task.created_by].filter((v): v is string => !!v);
    const profilesPromise = userIds.length
      ? supabase.from('user_profiles').select('id, first_name, last_name, email').in('id', userIds)
      : Promise.resolve({ data: [], error: null } as { data: any[]; error: null });

    const [projectRes, profilesRes] = await Promise.all([projectPromise, profilesPromise]);

    const profilesMap = new Map<string, { first_name: string; last_name: string; email: string }>();
    if (!profilesRes.error && profilesRes.data) {
      for (const u of profilesRes.data as any[]) profilesMap.set(u.id, u);
    }

    const taskData = task as any;
    return {
      ...taskData,
      name: taskData.name || taskData.title || 'Untitled Task',
      project_name: projectRes.data?.name || null,
      assigned_to_profile: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null,
      created_by_profile: task.created_by ? profilesMap.get(task.created_by) || null : null,
      tags: Array.isArray(taskData.tags) ? taskData.tags : [],
    };
  }

  /**
   * Create a task
   * @param taskData - Task data to create
   */
  async createTask(taskData: CreateTaskData): Promise<Task> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Fetch user profile - only select company_id which is guaranteed to exist
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('Failed to load user profile');
    }

    if (!userProfile) throw new Error('User profile not found');

    // Build insert data with only essential fields
    const insertData: Record<string, any> = {
      name: taskData.name,
      description: taskData.description || null,
      project_id: taskData.project_id,
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date || null,
      estimated_hours: taskData.estimated_hours || null,
      company_id: userProfile.company_id,
      created_by: user.id,
      assigned_to: taskData.assigned_to || user.id,
      tags: taskData.tags || [],
      status: 'open'
    };

    // Add category if provided
    if (taskData.category) {
      insertData.category = taskData.category;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating task: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a task
   * @param id - Task ID
   * @param updates - Task data to update
   */
  async updateTask(id: string, updates: UpdateTaskData): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating task: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a task
   * @param id - Task ID
   */
  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error deleting task: ${error.message}`);
    }
  }

  /**
   * Get task comments
   * @param taskId - Task ID
   */
  async getTaskComments(taskId: string) {
    const { data, error } = await supabase
      .from('task_comments')
      .select(`
        *,
        user_profiles!task_comments_user_id_fkey(first_name, last_name, email)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Error fetching task comments: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Add task comment
   * @param taskId - Task ID
   * @param comment - Comment text
   */
  async addTaskComment(taskId: string, comment: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        comment
      })
      .select(`
        *,
        user_profiles!task_comments_user_id_fkey(first_name, last_name, email)
      `)
      .single();

    if (error) {
      throw new Error(`Error adding task comment: ${error.message}`);
    }

    return data;
  }

  /**
   * Get tasks assigned to current user
   * @param status - Optional status filter
   */
  async getMyTasks(status?: string[]): Promise<TaskWithDetails[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    return this.getTasks({
      assigned_to: user.id,
      status
    });
  }

  /**
   * Get tasks created by current user
   * @param status - Optional status filter
   */
  async getTasksCreatedByMe(status?: string[]): Promise<TaskWithDetails[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error fetching created tasks: ${error.message}`);
    }

    const tasks = (data || []) as Task[];
    if (tasks.length === 0) return [];

    const projectIds = Array.from(new Set(tasks.map(t => t.project_id).filter(Boolean))) as string[];
    const userIds = Array.from(
      new Set(
        tasks
          .flatMap(t => [t.assigned_to, t.created_by])
          .filter((v): v is string => !!v)
      )
    );

    const [projectsRes, profilesRes] = await Promise.all([
      projectIds.length
        ? supabase.from('projects').select('id, name').in('id', projectIds)
        : Promise.resolve({ data: [], error: null } as { data: any[]; error: null }),
      userIds.length
        ? supabase.from('user_profiles').select('id, first_name, last_name, email').in('id', userIds)
        : Promise.resolve({ data: [], error: null } as { data: any[]; error: null }),
    ]);

    const projectsMap = new Map<string, { id: string; name: string }>();
    if (!projectsRes.error && projectsRes.data) {
      for (const p of projectsRes.data as any[]) projectsMap.set(p.id, p);
    }

    const profilesMap = new Map<string, { first_name: string; last_name: string; email: string }>();
    if (!profilesRes.error && profilesRes.data) {
      for (const u of profilesRes.data as any[]) profilesMap.set(u.id, u);
    }

    // Transform tasks with name/title compatibility
    return tasks.map((task: any) => ({
      ...task,
      name: task.name || task.title || 'Untitled Task',
      project_name: task.project_id ? projectsMap.get(task.project_id)?.name || null : null,
      assigned_to_profile: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null,
      created_by_profile: task.created_by ? profilesMap.get(task.created_by) || null : null,
      tags: Array.isArray(task.tags) ? task.tags : []
    }));
  }
}

export const taskService = new TaskService();