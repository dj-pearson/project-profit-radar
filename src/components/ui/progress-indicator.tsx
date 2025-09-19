import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface ProgressStepProps {
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  description?: string;
}

interface ProgressIndicatorProps {
  steps: ProgressStepProps[];
  className?: string;
}

export const ProgressStep = ({ label, status, description }: ProgressStepProps) => {
  const getIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'loading':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-center gap-3 py-2">
      {getIcon()}
      <div className="flex-1">
        <p className={cn(
          "text-sm font-medium",
          status === 'completed' ? "text-green-600" : 
          status === 'error' ? "text-red-600" :
          status === 'loading' ? "text-primary" : "text-muted-foreground"
        )}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
};

export const ProgressIndicator = ({ steps, className }: ProgressIndicatorProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      {steps.map((step, index) => (
        <ProgressStep key={index} {...step} />
      ))}
    </div>
  );
};

export const FileUploadProgress = ({ 
  fileName, 
  progress, 
  status 
}: { 
  fileName: string; 
  progress: number; 
  status: 'uploading' | 'completed' | 'error' 
}) => {
  return (
    <div className="space-y-2 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate">{fileName}</p>
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            status === 'error' ? "bg-red-500" :
            status === 'completed' ? "bg-green-500" : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      {status === 'error' && (
        <p className="text-xs text-red-600">Upload failed. Please try again.</p>
      )}
    </div>
  );
};