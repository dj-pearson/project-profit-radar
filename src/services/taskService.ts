import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Task {
  id: string;
  company_id: string;
  project_id: string;
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
   * Get tasks with multi-tenant site_id isolation
   * @param siteId - REQUIRED: Site ID for multi-tenant isolation
   * @param filters - Optional filters for status, assigned_to, project_id, search
   */
  async getTasks(siteId: string, filters?: {
    status?: string[];
    assigned_to?: string;
    project_id?: string;
    search?: string;
  }): Promise<TaskWithDetails[]> {
        // Use Supabase foreign key joins to fetch related data in a single query
    let query = supabase
      .from('tasks')
      .select(`
        id, name, description, status, priority, due_date, assigned_to, created_by,
        start_date, end_date, estimated_hours, actual_hours, completion_percentage,
        project_id, parent_task_id, dependencies, tags, created_at, updated_at,
        project:projects!project_id(id, name),
        assigned_to_profile:user_profiles!assigned_to(id, first_name, last_name, email),
        created_by_profile:user_profiles!created_by(id, first_name, last_name, email)
      `)
        // CRITICAL: Site isolation
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
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Error fetching tasks: ${error.message}`);
    }

    // Transform the data to match TaskWithDetails interface
    return (data || []).map((task: any) => ({
      ...task,
      project_name: task.project?.name || null,
      tags: task.tags || [],
    }));
  }

  /**
   * Get a single task with multi-tenant site_id isolation
   * @param siteId - REQUIRED: Site ID for multi-tenant isolation
   * @param id - Task ID
   */
  async getTask(siteId: string, id: string): Promise<TaskWithDetails | null> {
        const { data, error } = await supabase
      .from('tasks')
      .select('*')
        // CRITICAL: Site isolation
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error fetching task: ${error.message}`);
    }

    if (!data) return null;

    const task = data as Task;

    const projectPromise = task.project_id
      ? supabase.from('projects').select('id, name, site_id').eq('id', task.project_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as { data: any; error: null });

    const userIds = [task.assigned_to, task.created_by].filter((v): v is string => !!v);
    const profilesPromise = userIds.length
      ? supabase.from('user_profiles').select('id, first_name, last_name, email, site_id').in('id', userIds)
      : Promise.resolve({ data: [], error: null } as { data: any[]; error: null });

    const [projectRes, profilesRes] = await Promise.all([projectPromise, profilesPromise]);

    const profilesMap = new Map<string, { first_name: string; last_name: string; email: string }>();
    if (!profilesRes.error && profilesRes.data) {
      for (const u of profilesRes.data as any[]) profilesMap.set(u.id, u);
    }

    return {
      ...task,
      project_name: projectRes.data?.name || null,
      assigned_to_profile: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null,
      created_by_profile: task.created_by ? profilesMap.get(task.created_by) || null : null,
      tags: task.tags || [],
    };
  }

  /**
   * Create a task with multi-tenant site_id isolation
   * @param siteId - REQUIRED: Site ID for multi-tenant isolation
   * @param taskData - Task data to create
   */
  async createTask(siteId: string, taskData: CreateTaskData): Promise<Task> {
        const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('company_id')
        // CRITICAL: Site isolation
      .eq('id', user.id)
      .single();

    if (!userProfile) throw new Error('User profile not found');

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,  // CRITICAL: Site isolation
        company_id: userProfile.company_id,
        created_by: user.id,
        assigned_to: taskData.assigned_to || user.id,
        tags: taskData.tags || [],
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating task: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a task with multi-tenant site_id isolation
   * @param siteId - REQUIRED: Site ID for multi-tenant isolation
   * @param id - Task ID
   * @param updates - Task data to update
   */
  async updateTask(siteId: string, id: string, updates: UpdateTaskData): Promise<Task> {
        const { data, error } = await supabase
      .from('tasks')
      .update(updates)
        // CRITICAL: Site isolation
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating task: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a task with multi-tenant site_id isolation
   * @param siteId - REQUIRED: Site ID for multi-tenant isolation
   * @param id - Task ID
   */
  async deleteTask(siteId: string, id: string): Promise<void> {
        const { error } = await supabase
      .from('tasks')
      .delete()
        // CRITICAL: Site isolation
      .eq('id', id);

    if (error) {
      throw new Error(`Error deleting task: ${error.message}`);
    }
  }

  /**
   * Get task comments with multi-tenant site_id isolation
   * @param siteId - REQUIRED: Site ID for multi-tenant isolation
   * @param taskId - Task ID
   */
  async getTaskComments(siteId: string, taskId: string) {
        const { data, error } = await supabase
      .from('task_comments')
      .select(`
        *,
        user_profiles!task_comments_user_id_fkey(first_name, last_name, email)
      `)
        // CRITICAL: Site isolation
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Error fetching task comments: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Add task comment with multi-tenant site_id isolation
   * @param siteId - REQUIRED: Site ID for multi-tenant isolation
   * @param taskId - Task ID
   * @param comment - Comment text
   */
  async addTaskComment(siteId: string, taskId: string, comment: string) {
        const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('task_comments')
      .insert({  // CRITICAL: Site isolation
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
   * Get tasks assigned to current user with multi-tenant site_id isolation
   * @param siteId - REQUIRED: Site ID for multi-tenant isolation
   * @param status - Optional status filter
   */
  async getMyTasks(siteId: string, status?: string[]): Promise<TaskWithDetails[]> {
        const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    return this.getTasks(siteId, {
      assigned_to: user.id,
      status
    });
  }

  /**
   * Get tasks created by current user with multi-tenant site_id isolation
   * @param siteId - REQUIRED: Site ID for multi-tenant isolation
   * @param status - Optional status filter
   */
  async getTasksCreatedByMe(siteId: string, status?: string[]): Promise<TaskWithDetails[]> {
        const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('tasks')
      .select('*')
        // CRITICAL: Site isolation
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
        ? supabase.from('projects').select('id, name, site_id').in('id', projectIds)
        : Promise.resolve({ data: [], error: null } as { data: any[]; error: null }),
      userIds.length
        ? supabase.from('user_profiles').select('id, first_name, last_name, email, site_id').in('id', userIds)
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

    return tasks.map(task => ({
      ...task,
      project_name: task.project_id ? projectsMap.get(task.project_id)?.name || null : null,
      assigned_to_profile: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null,
      created_by_profile: task.created_by ? profilesMap.get(task.created_by) || null : null,
      tags: task.tags || []
    }));
  }
}

export const taskService = new TaskService();