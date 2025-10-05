import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
  inline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ 
  message = 'Loading...', 
  fullPage = false,
  inline = false,
  size = 'md'
}: LoadingStateProps) {
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const iconSize = iconSizes[size];

  if (inline) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className={`${iconSize} animate-spin`} />
        <span className="text-sm">{message}</span>
      </div>
    );
  }

  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <Loader2 className={`${iconSize} animate-spin text-primary`} />
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {content}
      </div>
    );
  }

  return (
    <Card className="w-full">
      {content}
    </Card>
  );
}

export function SkeletonCard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-6 space-y-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
        </Card>
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded flex-1 animate-pulse" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div key={colIdx} className="h-4 bg-muted rounded flex-1 animate-pulse" style={{ animationDelay: `${rowIdx * 50}ms` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
