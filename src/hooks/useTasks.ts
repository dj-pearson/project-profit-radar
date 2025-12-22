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
    return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => {
            return taskService.getTasks(siteId, filters);  // Pass siteId to service
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!siteId,
  });
};

export const useTask = (id: string) => {
    return useQuery({
    queryKey: ['task', id],
    queryFn: () => {
            return taskService.getTask(siteId, id);  // Pass siteId to service
    },
    enabled: !!id,
  });
};

export const useMyTasks = (status?: string[]) => {
    return useQuery({
    queryKey: ['my-tasks', status],
    queryFn: () => {
            return taskService.getMyTasks(siteId, status);  // Pass siteId to service
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: 'always',
    enabled: !!siteId,
  });
};

export const useTasksCreatedByMe = (status?: string[]) => {
    return useQuery({
    queryKey: ['tasks-created-by-me', status],
    queryFn: () => {
            return taskService.getTasksCreatedByMe(siteId, status);  // Pass siteId to service
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: 'always',
    enabled: !!siteId,
  });
};

export const useCreateTask = () => {
    const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData: CreateTaskData) => {
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
    const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskData }) => {
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
    const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
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
    return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => {
            return taskService.getTaskComments(siteId, taskId);  // Pass siteId to service
    },
    enabled: !!taskId,
  });
};

export const useAddTaskComment = () => {
    const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, comment }: { taskId: string; comment: string }) => {
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
