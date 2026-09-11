import React from "react";
import { cn } from "@/lib/utils";

export type LoadingSpinnerSize = "sm" | "md" | "lg" | "xl";

/**
 * `tone="current"` inherits the surrounding text colour, which is what you
 * want inside a button — it survives a variant change, where a hard-coded
 * `border-white` does not.
 */
export type LoadingSpinnerTone = "primary" | "current";

interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
  tone?: LoadingSpinnerTone;
  className?: string;
  /**
   * Announced by screen readers while the spinner is mounted. Pass null when
   * something else nearby already carries the status text, so the page does
   * not announce it twice.
   */
  label?: string | null;
}

const sizeClasses: Record<LoadingSpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-32 w-32",
};

const toneClasses: Record<LoadingSpinnerTone, string> = {
  primary: "border-muted border-t-primary",
  current: "border-current/25 border-t-current",
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  tone = "primary",
  className,
  label = "Loading",
}) => {
  const decorative = label === null;

  return (
    <div
      role={decorative ? undefined : "status"}
      aria-live={decorative ? undefined : "polite"}
      aria-hidden={decorative || undefined}
      className={cn(
        "animate-spin rounded-full border-2",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
    >
      {!decorative && <span className="sr-only">{label}</span>}
    </div>
  );
};

export const LoadingState: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = "Loading...", className }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center p-8", className)}
    >
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" label={null} className="mx-auto" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};
