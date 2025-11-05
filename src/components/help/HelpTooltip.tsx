import * as React from "react";
import { HelpCircle, Info, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type HelpTooltipVariant = "info" | "help" | "warning";

interface HelpTooltipProps {
  /**
   * The help content to display in the tooltip
   */
  content: React.ReactNode;

  /**
   * Visual style variant
   * - info: General information (Info icon, blue)
   * - help: Help/guidance (HelpCircle icon, muted)
   * - warning: Important note (AlertCircle icon, amber)
   */
  variant?: HelpTooltipVariant;

  /**
   * Side to display tooltip (default: top)
   */
  side?: "top" | "right" | "bottom" | "left";

  /**
   * Icon size (default: 16px for forms, 20px for headings)
   */
  size?: number;

  /**
   * Additional CSS classes for the trigger button
   */
  className?: string;

  /**
   * Disable the tooltip
   */
  disabled?: boolean;

  /**
   * Custom trigger element (replaces icon)
   */
  trigger?: React.ReactNode;

  /**
   * Show tooltip immediately on mount (for guided tours)
   */
  defaultOpen?: boolean;

  /**
   * Delay before showing tooltip (ms)
   */
  delayDuration?: number;
}

/**
 * HelpTooltip - Inline help component for forms, features, and complex UI
 *
 * Usage:
 * ```tsx
 * <FormLabel>
 *   Job Cost Code
 *   <HelpTooltip
 *     content="Cost codes organize expenses by category (e.g., Labor, Materials)"
 *     variant="help"
 *   />
 * </FormLabel>
 * ```
 */
export function HelpTooltip({
  content,
  variant = "help",
  side = "top",
  size = 16,
  className,
  disabled = false,
  trigger,
  defaultOpen = false,
  delayDuration = 200,
}: HelpTooltipProps) {
  // Icon mapping
  const icons = {
    info: Info,
    help: HelpCircle,
    warning: AlertCircle,
  };

  const Icon = icons[variant];

  // Color variants
  const variantStyles = {
    info: "text-blue-500 hover:text-blue-600",
    help: "text-muted-foreground hover:text-foreground",
    warning: "text-amber-500 hover:text-amber-600",
  };

  if (disabled) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip defaultOpen={defaultOpen}>
        <TooltipTrigger asChild>
          {trigger ? (
            <span>{trigger}</span>
          ) : (
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "rounded-full ml-1.5",
                variantStyles[variant],
                className
              )}
              aria-label={`Help: ${typeof content === 'string' ? content : 'More information'}`}
            >
              <Icon size={size} />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className={cn(
            "max-w-xs text-sm",
            variant === "warning" && "border-amber-500/20 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
          )}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * FormFieldHelp - Specialized tooltip for form field help
 * Optimized for placement next to form labels
 */
export function FormFieldHelp({ content, className, ...props }: Omit<HelpTooltipProps, 'variant'>) {
  return (
    <HelpTooltip
      content={content}
      variant="help"
      size={14}
      side="right"
      className={className}
      {...props}
    />
  );
}

/**
 * FeatureHelp - Specialized tooltip for feature explanations
 * Larger icon for page headings and feature sections
 */
export function FeatureHelp({ content, className, ...props }: Omit<HelpTooltipProps, 'variant' | 'size'>) {
  return (
    <HelpTooltip
      content={content}
      variant="info"
      size={20}
      className={className}
      {...props}
    />
  );
}
