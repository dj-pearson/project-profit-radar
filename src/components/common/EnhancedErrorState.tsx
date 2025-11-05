import * as React from "react";
import {
  AlertTriangle,
  RefreshCw,
  Wifi,
  Server,
  Lock,
  FileQuestion,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type ErrorCategory =
  | "network"
  | "server"
  | "validation"
  | "permission"
  | "notfound"
  | "unknown";

export interface RecoverySuggestion {
  text: string;
  action?: () => void;
  actionLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface EnhancedErrorStateProps {
  /**
   * Error object or message
   */
  error: Error | string;

  /**
   * Error category for better messaging
   */
  category?: ErrorCategory;

  /**
   * Title override
   */
  title?: string;

  /**
   * Recovery suggestions
   */
  suggestions?: RecoverySuggestion[];

  /**
   * Retry action
   */
  onRetry?: () => void;

  /**
   * Contact support action
   */
  onContactSupport?: () => void;

  /**
   * Display mode
   */
  mode?: "inline" | "card" | "full-page";

  /**
   * Error code for support reference
   */
  errorCode?: string;

  /**
   * Show technical details (for developers)
   */
  showTechnicalDetails?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Error category metadata
 */
const ERROR_METADATA: Record<
  ErrorCategory,
  {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    defaultSuggestions: RecoverySuggestion[];
  }
> = {
  network: {
    icon: Wifi,
    title: "Connection Error",
    defaultSuggestions: [
      {
        text: "Check your internet connection",
        icon: Wifi,
      },
      {
        text: "Try refreshing the page",
        action: () => window.location.reload(),
        actionLabel: "Refresh",
        icon: RefreshCw,
      },
      {
        text: "If the problem persists, check your network settings or contact your IT department",
      },
    ],
  },
  server: {
    icon: Server,
    title: "Server Error",
    defaultSuggestions: [
      {
        text: "Our servers are experiencing issues. Please try again in a few minutes.",
        icon: Server,
      },
      {
        text: "Retry the operation",
        actionLabel: "Retry",
        icon: RefreshCw,
      },
      {
        text: "Check our status page for ongoing incidents",
        action: () => window.open("https://status.builddesk.com", "_blank"),
        actionLabel: "Status Page",
        icon: ExternalLink,
      },
    ],
  },
  validation: {
    icon: AlertTriangle,
    title: "Validation Error",
    defaultSuggestions: [
      {
        text: "Please check the form for errors and correct any invalid fields",
        icon: AlertTriangle,
      },
      {
        text: "Required fields must be filled out",
      },
      {
        text: "Ensure all data is in the correct format (dates, phone numbers, emails, etc.)",
      },
    ],
  },
  permission: {
    icon: Lock,
    title: "Permission Denied",
    defaultSuggestions: [
      {
        text: "You don't have permission to perform this action",
        icon: Lock,
      },
      {
        text: "Contact your administrator to request access",
      },
      {
        text: "Try signing out and signing back in",
        action: () => {
          // Sign out logic would go here
          window.location.href = "/sign-in";
        },
        actionLabel: "Sign Out",
      },
    ],
  },
  notfound: {
    icon: FileQuestion,
    title: "Not Found",
    defaultSuggestions: [
      {
        text: "The item you're looking for doesn't exist or has been deleted",
        icon: FileQuestion,
      },
      {
        text: "Check the URL and try again",
      },
      {
        text: "Go back to the previous page",
        action: () => window.history.back(),
        actionLabel: "Go Back",
      },
    ],
  },
  unknown: {
    icon: HelpCircle,
    title: "Something Went Wrong",
    defaultSuggestions: [
      {
        text: "An unexpected error occurred",
        icon: HelpCircle,
      },
      {
        text: "Try refreshing the page",
        action: () => window.location.reload(),
        actionLabel: "Refresh",
        icon: RefreshCw,
      },
      {
        text: "If this persists, contact support with the error code below",
      },
    ],
  },
};

/**
 * Auto-detect error category from error message
 */
function detectErrorCategory(error: Error | string): ErrorCategory {
  const message =
    typeof error === "string" ? error.toLowerCase() : error.message.toLowerCase();

  if (
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("fetch")
  ) {
    return "network";
  }

  if (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("server error")
  ) {
    return "server";
  }

  if (
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("required")
  ) {
    return "validation";
  }

  if (
    message.includes("permission") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("403")
  ) {
    return "permission";
  }

  if (message.includes("not found") || message.includes("404")) {
    return "notfound";
  }

  return "unknown";
}

/**
 * EnhancedErrorState - User-friendly error display with recovery suggestions
 *
 * Provides context-specific guidance to help users recover from errors.
 */
export function EnhancedErrorState({
  error,
  category: providedCategory,
  title: providedTitle,
  suggestions: providedSuggestions,
  onRetry,
  onContactSupport,
  mode = "card",
  errorCode,
  showTechnicalDetails = false,
  className,
}: EnhancedErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Detect category if not provided
  const category = providedCategory || detectErrorCategory(error);
  const metadata = ERROR_METADATA[category];

  // Generate error code if not provided
  const finalErrorCode =
    errorCode ||
    `ERR-${category.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  // Combine suggestions
  const allSuggestions = [
    ...(providedSuggestions || []),
    ...metadata.defaultSuggestions.filter(
      s => !providedSuggestions?.some(ps => ps.text === s.text)
    ),
  ];

  // Add retry to suggestions if provided
  if (onRetry && !allSuggestions.some(s => s.actionLabel === "Retry")) {
    allSuggestions.unshift({
      text: "Retry the operation",
      action: onRetry,
      actionLabel: "Retry",
      icon: RefreshCw,
    });
  }

  const errorMessage =
    typeof error === "string" ? error : error.message || "An error occurred";

  const Icon = metadata.icon;
  const title = providedTitle || metadata.title;

  // Render different modes
  if (mode === "full-page") {
    return (
      <div className={cn("min-h-[400px] flex items-center justify-center p-8", className)}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <Icon className="h-12 w-12 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
          </div>

          {allSuggestions.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
              <p className="font-semibold text-sm">What you can do:</p>
              <ul className="space-y-2">
                {allSuggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    {suggestion.icon && (
                      <suggestion.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <span>{suggestion.text}</span>
                      {suggestion.action && suggestion.actionLabel && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={suggestion.action}
                          className="h-auto p-0 ml-2"
                        >
                          {suggestion.actionLabel}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Error Code:</span>
              <code className="px-2 py-1 bg-muted rounded font-mono">
                {finalErrorCode}
              </code>
            </div>

            {showTechnicalDetails && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide technical details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show technical details
                  </>
                )}
              </button>
            )}

            {showDetails && (
              <pre className="text-left text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                {typeof error === "string" ? error : error.stack || error.message}
              </pre>
            )}
          </div>

          {onContactSupport && (
            <Button variant="outline" onClick={onContactSupport}>
              Contact Support
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Card or inline mode
  return (
    <Alert variant="destructive" className={cn("relative", className)}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        {title}
        <span className="text-xs font-mono opacity-70">{finalErrorCode}</span>
      </AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <p>{errorMessage}</p>

        {allSuggestions.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-sm">Suggestions:</p>
            <ul className="space-y-1.5 text-sm">
              {allSuggestions.slice(0, 3).map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  {suggestion.icon && (
                    <suggestion.icon className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-70" />
                  )}
                  <div className="flex-1">
                    <span className="opacity-90">{suggestion.text}</span>
                    {suggestion.action && suggestion.actionLabel && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={suggestion.action}
                        className="h-auto p-0 ml-1 text-destructive-foreground underline"
                      >
                        {suggestion.actionLabel}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showTechnicalDetails && (
          <details className="text-xs">
            <summary className="cursor-pointer opacity-70 hover:opacity-100">
              Technical details
            </summary>
            <pre className="mt-2 bg-background/50 p-2 rounded overflow-auto max-h-32">
              {typeof error === "string" ? error : error.stack || error.message}
            </pre>
          </details>
        )}
      </AlertDescription>
    </Alert>
  );
}
