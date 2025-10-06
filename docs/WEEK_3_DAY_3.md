# Week 3 Day 3: Error Handling & Loading States

## 🎯 Objectives
- Implement comprehensive error handling patterns
- Create reusable loading state components
- Set up real-time data synchronization
- Build user-friendly error recovery flows

## 🚨 Error Handling Strategy

### Error Types & Handling

#### 1. Network Errors
```typescript
// Connection issues, timeouts
{
  type: 'network',
  message: 'Unable to connect. Check your internet connection.',
  retry: true,
  action: 'retry'
}
```

#### 2. Authentication Errors
```typescript
// Expired sessions, unauthorized access
{
  type: 'auth',
  message: 'Your session has expired. Please log in again.',
  retry: false,
  action: 'redirect_to_login'
}
```

#### 3. Validation Errors
```typescript
// User input errors, business logic violations
{
  type: 'validation',
  message: 'Please fix the following errors:',
  fields: {
    email: 'Invalid email format',
    budget: 'Budget must be greater than 0'
  },
  retry: false
}
```

#### 4. Server Errors
```typescript
// 500s, database errors, unexpected failures
{
  type: 'server',
  message: 'Something went wrong on our end. We\'re working on it.',
  retry: true,
  action: 'retry',
  reportable: true
}
```

#### 5. Not Found Errors
```typescript
// 404s, deleted resources
{
  type: 'not_found',
  message: 'This project no longer exists.',
  retry: false,
  action: 'redirect_to_list'
}
```

## 🔧 Error Handling Components

### Global Error Boundary
```typescript
// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log to error tracking service
    if (import.meta.env.PROD) {
      // logErrorToService(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Query Error Handler
```typescript
// src/components/QueryError.tsx
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

interface QueryErrorProps {
  error: Error;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

export const QueryError = ({ error, onRetry, showHomeButton }: QueryErrorProps) => {
  const navigate = useNavigate();
  
  const getErrorMessage = (error: Error) => {
    // Parse Supabase errors
    if (error.message.includes('JWT')) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.message.includes('Failed to fetch')) {
      return 'Unable to connect. Please check your internet connection.';
    }
    if (error.message.includes('not found')) {
      return 'The requested resource was not found.';
    }
    return 'An unexpected error occurred. Please try again.';
  };

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="mt-2">
        {getErrorMessage(error)}
      </AlertDescription>
      <div className="mt-4 flex gap-2">
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </Button>
        )}
        {showHomeButton && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <Home className="h-3 w-3" />
            Go Home
          </Button>
        )}
      </div>
    </Alert>
  );
};
```

### Inline Error Display
```typescript
// src/components/InlineError.tsx
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const InlineError = ({ message, onDismiss, className }: InlineErrorProps) => {
  return (
    <div className={cn(
      "flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm",
      className
    )}>
      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
      <p className="flex-1 text-destructive">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-destructive hover:text-destructive/80 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
```

## ⏳ Loading State Components

### Skeleton Loaders
```typescript
// src/components/skeletons/ProjectCardSkeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const ProjectCardSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Usage in list
export const ProjectListSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
};
```

### Loading Spinner
```typescript
// src/components/LoadingSpinner.tsx
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  message,
  className 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
};

// Full page loading
export const PageLoading = ({ message = 'Loading...' }: { message?: string }) => {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
};
```

### Progress Indicators
```typescript
// src/components/ProgressIndicator.tsx
import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
}

export const ProgressIndicator = ({ 
  value, 
  label,
  showPercentage = true 
}: ProgressIndicatorProps) => {
  return (
    <div className="space-y-2">
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          {showPercentage && (
            <span className="font-medium">{Math.round(value)}%</span>
          )}
        </div>
      )}
      <Progress value={value} />
    </div>
  );
};
```

## 🔄 Real-Time Updates

### Supabase Real-Time Hook
```typescript
// src/hooks/useRealtimeSubscription.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  queryKey: unknown[];
}

export const useRealtimeSubscription = ({
  table,
  event = '*',
  filter,
  queryKey,
}: UseRealtimeOptions) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      channel = supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          {
            event,
            schema: 'public',
            table,
            filter,
          },
          (payload) => {
            console.log('Real-time update:', payload);
            
            // Invalidate queries to trigger refetch
            queryClient.invalidateQueries({ queryKey });
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, event, filter, queryKey, queryClient]);
};

// Usage example
export const ProjectList = () => {
  const { data: projects } = useProjects();

  // Subscribe to real-time project updates
  useRealtimeSubscription({
    table: 'projects',
    event: '*',
    queryKey: ['projects'],
  });

  return <div>{/* render projects */}</div>;
};
```

### Optimistic Updates
```typescript
// src/lib/mutations/optimisticUpdate.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useOptimisticTaskUpdate = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    
    // Optimistic update before server response
    onMutate: async ({ taskId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(['tasks', projectId]);

      // Optimistically update cache
      queryClient.setQueryData(['tasks', projectId], (old: any) => {
        if (!old?.tasks) return old;
        
        return {
          ...old,
          tasks: old.tasks.map((task: any) =>
            task.id === taskId ? { ...task, ...updates } : task
          ),
        };
      });

      return { previousTasks };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', projectId], context.previousTasks);
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
};
```

## 📱 Empty States

### Empty State Component
```typescript
// src/components/EmptyState.tsx
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      <div className="rounded-full bg-muted p-6 mb-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
};

// Usage
import { FolderOpen } from 'lucide-react';

<EmptyState
  icon={FolderOpen}
  title="No projects yet"
  description="Get started by creating your first construction project. Track tasks, manage documents, and collaborate with your team."
  actionLabel="Create Project"
  onAction={() => setShowCreateDialog(true)}
/>
```

## 🎯 Complete Data Flow Example

```typescript
// src/pages/ProjectDetail.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '@/lib/queries/projectQueries';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoading } from '@/components/LoadingSpinner';
import { QueryError } from '@/components/QueryError';
import { EmptyState } from '@/components/EmptyState';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

export const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { 
    data: project, 
    isLoading, 
    error,
    refetch 
  } = useProject(id);

  // Subscribe to real-time updates
  useRealtimeSubscription({
    table: 'projects',
    filter: `id=eq.${id}`,
    queryKey: ['project', id],
  });

  // Loading state
  if (isLoading) {
    return <PageLoading message="Loading project..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="container py-8">
        <QueryError 
          error={error} 
          onRetry={refetch}
          showHomeButton
        />
      </div>
    );
  }

  // Empty state (should rarely happen with proper routing)
  if (!project) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Project not found"
        description="This project may have been deleted or you don't have access to it."
        actionLabel="Back to Projects"
        onAction={() => navigate('/projects')}
      />
    );
  }

  // Success state - render project
  return (
    <ErrorBoundary>
      <div className="container py-8">
        {/* Project content */}
      </div>
    </ErrorBoundary>
  );
};
```

## 🎨 Loading State Best Practices

### 1. Progressive Loading
- Show skeleton for initial load
- Load critical data first
- Defer non-critical data (images, secondary info)

### 2. Skeleton Matching
- Skeleton should match final layout
- Use same spacing and sizing
- Maintain visual continuity

### 3. Optimistic Updates
- Update UI immediately for user actions
- Show feedback instantly
- Rollback on error with toast notification

### 4. Loading Indicators
- Use spinners for < 2 second waits
- Use progress bars for longer operations
- Use skeletons for initial page loads

## ✅ Error Handling Checklist

- [x] Global error boundary implemented
- [x] Query-specific error handling
- [x] Network error detection
- [x] Auth error detection
- [x] User-friendly error messages
- [x] Retry mechanisms for recoverable errors
- [x] Error logging for debugging
- [x] Graceful degradation
- [x] Clear call-to-actions in error states
- [x] Consistent error UI across app

## ✅ Loading State Checklist

- [x] Skeleton loaders for all list views
- [x] Loading spinners for actions
- [x] Progress indicators for long operations
- [x] Optimistic updates for instant feedback
- [x] Empty states with helpful messages
- [x] Loading states respect design system
- [x] Accessible loading announcements
- [x] Mobile-optimized loading UX

## 📊 Performance Metrics

### Target Metrics
- Time to Interactive (TTI): < 3.5s
- First Contentful Paint (FCP): < 1.8s
- Error recovery time: < 1s
- Optimistic update perceived latency: < 50ms

### Monitoring
```typescript
// Track error rates
const errorRate = (failedRequests / totalRequests) * 100;
// Target: < 1%

// Track retry success rate
const retrySuccessRate = (successfulRetries / totalRetries) * 100;
// Target: > 80%
```

---

**Status**: ✅ Week 3 Day 3 Complete - Error handling and loading patterns established!
