/**
 * Tasks Hook
 * Updated with multi-tenant site_id isolation
 * Now passes siteId to taskService for complete isolation
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, Task, TaskWithDetails, CreateTaskData, UpdateTaskData } from '@/services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useTasks = (filters?: {
  status?: string[];
  assigned_to?: string;
  project_id?: string;
  search?: string;
}) => {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['tasks', filters, siteId],
    queryFn: () => {
      if (!siteId) throw new Error('Site ID is required');
      return taskService.getTasks(siteId, filters);  // Pass siteId to service
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!siteId,
  });
};

export const useTask = (id: string) => {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['task', id, siteId],
    queryFn: () => {
      if (!siteId) throw new Error('Site ID is required');
      return taskService.getTask(siteId, id);  // Pass siteId to service
    },
    enabled: !!id && !!siteId,
  });
};

export const useMyTasks = (status?: string[]) => {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['my-tasks', status, siteId],
    queryFn: () => {
      if (!siteId) throw new Error('Site ID is required');
      return taskService.getMyTasks(siteId, status);  // Pass siteId to service
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: 'always',
    enabled: !!siteId,
  });
};

export const useTasksCreatedByMe = (status?: string[]) => {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['tasks-created-by-me', status, siteId],
    queryFn: () => {
      if (!siteId) throw new Error('Site ID is required');
      return taskService.getTasksCreatedByMe(siteId, status);  // Pass siteId to service
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: 'always',
    enabled: !!siteId,
  });
};

export const useCreateTask = () => {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData: CreateTaskData) => {
      if (!siteId) throw new Error('Site ID is required');
      return taskService.createTask(siteId, taskData);  // Pass siteId to service
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-created-by-me'] });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create task',
      });
    },
  });
};

export const useUpdateTask = () => {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskData }) => {
      if (!siteId) throw new Error('Site ID is required');
      return taskService.updateTask(siteId, id, updates);  // Pass siteId to service
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-created-by-me'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update task',
      });
    },
  });
};

export const useDeleteTask = () => {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!siteId) throw new Error('Site ID is required');
      return taskService.deleteTask(siteId, id);  // Pass siteId to service
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-created-by-me'] });
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete task',
      });
    },
  });
};

export const useTaskComments = (taskId: string) => {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['task-comments', taskId, siteId],
    queryFn: () => {
      if (!siteId) throw new Error('Site ID is required');
      return taskService.getTaskComments(siteId, taskId);  // Pass siteId to service
    },
    enabled: !!taskId && !!siteId,
  });
};

export const useAddTaskComment = () => {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, comment }: { taskId: string; comment: string }) => {
      if (!siteId) throw new Error('Site ID is required');
      return taskService.addTaskComment(siteId, taskId, comment);  // Pass siteId to service
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      toast({
        title: 'Success',
        description: 'Comment added successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add comment',
      });
    },
  });
};
