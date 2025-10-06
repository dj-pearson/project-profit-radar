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
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
