import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
}

/**
 * Accessible loading spinner component
 * Includes proper ARIA attributes for screen readers
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  className,
  label = "Loading"
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-muted border-t-primary",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
};

interface LoadingStateProps {
  message?: string;
  className?: string;
  /** Hide the visual message, show only to screen readers */
  srOnly?: boolean;
}

/**
 * Full loading state component with spinner and message
 * Accessible by default with proper ARIA attributes
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  className,
  srOnly = false
}) => {
  return (
    <div
      className={cn("flex items-center justify-center p-8", className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" label={message} />
        <p className={cn("text-muted-foreground", srOnly && "sr-only")}>
          {message}
        </p>
      </div>
    </div>
  );
};