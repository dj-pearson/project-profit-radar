import * as React from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type ProgressStatus = "idle" | "loading" | "success" | "error";

interface ProgressIndicatorProps {
  /**
   * Current progress (0-100)
   */
  progress?: number;

  /**
   * Progress status
   */
  status?: ProgressStatus;

  /**
   * Label to display
   */
  label?: string;

  /**
   * Show percentage text
   * Default: true
   */
  showPercentage?: boolean;

  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";

  /**
   * Display mode
   */
  mode?: "inline" | "modal" | "toast";

  /**
   * Message to show during loading
   */
  loadingMessage?: string;

  /**
   * Message to show on success
   */
  successMessage?: string;

  /**
   * Message to show on error
   */
  errorMessage?: string;

  /**
   * Show elapsed time
   */
  showElapsedTime?: boolean;

  /**
   * Start time (for elapsed calculation)
   */
  startTime?: Date;

  /**
   * Estimated time remaining (seconds)
   */
  estimatedTimeRemaining?: number;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Cancel action
   */
  onCancel?: () => void;
}

/**
 * Format time duration in human-readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Calculate elapsed time
 */
function useElapsedTime(startTime?: Date) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsedMs = now.getTime() - startTime.getTime();
      setElapsed(elapsedMs / 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return elapsed;
}

/**
 * ProgressIndicator - Visual progress feedback for long operations
 *
 * Shows determinate or indeterminate progress with status, time estimates,
 * and contextual messages.
 */
export function ProgressIndicator({
  progress,
  status = "idle",
  label,
  showPercentage = true,
  size = "md",
  mode = "inline",
  loadingMessage,
  successMessage,
  errorMessage,
  showElapsedTime = false,
  startTime,
  estimatedTimeRemaining,
  className,
  onCancel,
}: ProgressIndicatorProps) {
  const elapsed = useElapsedTime(startTime);

  // Size variants
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24,
  };

  // Status icons and colors
  const statusConfig = {
    idle: {
      icon: null,
      color: "text-muted-foreground",
    },
    loading: {
      icon: Loader2,
      color: "text-blue-500",
      animate: true,
    },
    success: {
      icon: CheckCircle2,
      color: "text-green-500",
    },
    error: {
      icon: XCircle,
      color: "text-red-500",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // Determine message based on status
  let message = label;
  if (status === "loading" && loadingMessage) {
    message = loadingMessage;
  } else if (status === "success" && successMessage) {
    message = successMessage;
  } else if (status === "error" && errorMessage) {
    message = errorMessage;
  }

  // Determinate vs indeterminate
  const isDeterminate = typeof progress === "number" && progress >= 0 && progress <= 100;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header with icon and label */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {Icon && (
            <Icon
              size={iconSizes[size]}
              className={cn(
                config.color,
                'animate' in config && config.animate && "animate-spin"
              )}
            />
          )}
          {message && (
            <span className={cn("font-medium truncate", sizeClasses[size])}>
              {message}
            </span>
          )}
        </div>

        {/* Percentage or time info */}
        <div className="flex items-center gap-2 text-muted-foreground shrink-0">
          {isDeterminate && showPercentage && (
            <span className={cn("font-mono", sizeClasses[size])}>
              {Math.round(progress)}%
            </span>
          )}

          {showElapsedTime && elapsed > 0 && (
            <span className={sizeClasses[size]}>
              {formatDuration(elapsed)}
            </span>
          )}

          {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
            <span className={sizeClasses[size]}>
              ~{formatDuration(estimatedTimeRemaining)} left
            </span>
          )}

          {onCancel && status === "loading" && (
            <button
              onClick={onCancel}
              className={cn(
                "text-muted-foreground hover:text-foreground underline",
                sizeClasses[size]
              )}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {status === "loading" && (
        <Progress
          value={isDeterminate ? progress : undefined}
          className={cn(
            size === "sm" && "h-1",
            size === "md" && "h-2",
            size === "lg" && "h-3"
          )}
        />
      )}
    </div>
  );
}

/**
 * MultiStepProgress - Progress indicator for multi-step operations
 */
interface MultiStepProgressProps {
  /**
   * Steps in the process
   */
  steps: Array<{
    id: string;
    label: string;
    status: "pending" | "active" | "completed" | "error";
  }>;

  /**
   * Current step index
   */
  currentStep?: number;

  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function MultiStepProgress({
  steps,
  currentStep,
  size = "md",
  className,
}: MultiStepProgressProps) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <div className={cn("space-y-2", className)}>
      {steps.map((step, index) => {
        const isActive = index === currentStep || step.status === "active";
        const isCompleted = step.status === "completed";
        const isError = step.status === "error";

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 py-2 px-3 rounded-lg transition-colors",
              isActive && "bg-muted/50",
              isCompleted && "opacity-60"
            )}
          >
            {/* Step indicator */}
            <div
              className={cn(
                "flex items-center justify-center rounded-full shrink-0",
                size === "sm" && "h-6 w-6",
                size === "md" && "h-8 w-8",
                size === "lg" && "h-10 w-10",
                isCompleted && "bg-green-500 text-white",
                isError && "bg-red-500 text-white",
                isActive && "bg-blue-500 text-white animate-pulse",
                !isActive && !isCompleted && !isError && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <CheckCircle2 size={iconSizes[size]} />
              ) : isError ? (
                <XCircle size={iconSizes[size]} />
              ) : isActive ? (
                <Loader2 size={iconSizes[size]} className="animate-spin" />
              ) : (
                <span className={cn("font-semibold", sizeClasses[size])}>
                  {index + 1}
                </span>
              )}
            </div>

            {/* Step label */}
            <span
              className={cn(
                "font-medium flex-1",
                sizeClasses[size],
                isActive && "text-foreground",
                !isActive && !isCompleted && "text-muted-foreground"
              )}
            >
              {step.label}
            </span>

            {/* Status indicator */}
            {isActive && (
              <span className={cn("text-blue-500", sizeClasses[size])}>
                In progress...
              </span>
            )}
            {isCompleted && (
              <CheckCircle2 size={iconSizes[size]} className="text-green-500" />
            )}
            {isError && (
              <span className={cn("text-red-500", sizeClasses[size])}>
                Failed
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * useProgress - Hook for managing progress state
 */
export function useProgress() {
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState<ProgressStatus>("idle");
  const [startTime, setStartTime] = React.useState<Date>();

  const start = React.useCallback(() => {
    setProgress(0);
    setStatus("loading");
    setStartTime(new Date());
  }, []);

  const update = React.useCallback((value: number) => {
    setProgress(Math.min(100, Math.max(0, value)));
  }, []);

  const increment = React.useCallback((amount: number = 10) => {
    setProgress(prev => Math.min(100, prev + amount));
  }, []);

  const complete = React.useCallback(() => {
    setProgress(100);
    setStatus("success");
  }, []);

  const fail = React.useCallback(() => {
    setStatus("error");
  }, []);

  const reset = React.useCallback(() => {
    setProgress(0);
    setStatus("idle");
    setStartTime(undefined);
  }, []);

  return {
    progress,
    status,
    startTime,
    start,
    update,
    increment,
    complete,
    fail,
    reset,
  };
}
