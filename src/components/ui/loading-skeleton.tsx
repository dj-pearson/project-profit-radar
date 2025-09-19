import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Construction-specific skeleton patterns
export const ProjectCardSkeleton = () => (
  <div className="p-6 border rounded-lg space-y-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <Skeleton className="h-5 w-[200px]" /> {/* Project name */}
        <Skeleton className="h-3 w-[120px]" /> {/* Status badge */}
      </div>
      <Skeleton className="h-8 w-8 rounded-full" /> {/* Avatar */}
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-[100px]" /> {/* Progress label */}
      <Skeleton className="h-2 w-full rounded-full" /> {/* Progress bar */}
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <Skeleton className="h-3 w-[60px]" />
        <Skeleton className="h-4 w-[80px]" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-[50px]" />
        <Skeleton className="h-4 w-[70px]" />
      </div>
    </div>
  </div>
);

export const TimelineEntrySkeleton = () => (
  <div className="flex gap-4 p-4">
    <div className="flex flex-col items-center">
      <Skeleton className="h-3 w-3 rounded-full" />
      <Skeleton className="h-8 w-px" />
    </div>
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-3 w-[80px]" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-[70%]" />
    </div>
  </div>
);

export const StatsGridSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="p-6 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <Skeleton className="h-8 w-[80px] mb-1" />
        <Skeleton className="h-3 w-[60px]" />
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    <div className="flex items-center space-x-4 pb-2 border-b">
      <Skeleton className="h-4 w-[120px]" />
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-4 w-[80px]" />
      <Skeleton className="h-4 w-[90px]" />
      <Skeleton className="h-4 w-[60px]" />
    </div>
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-4 w-[90px]" />
        <Skeleton className="h-4 w-[60px]" />
      </div>
    ))}
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-[120px]" />
      <Skeleton className="h-20 w-full" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-[90px]" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
    <div className="flex justify-end gap-2">
      <Skeleton className="h-10 w-[80px]" />
      <Skeleton className="h-10 w-[100px]" />
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <StatsGridSkeleton />
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Skeleton className="h-6 w-[180px]" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-[150px]" />
        <div className="border rounded-lg p-4">
          {[...Array(4)].map((_, i) => (
            <TimelineEntrySkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const LoadingSpinner = ({ size = "default" }: { size?: "sm" | "default" | "lg" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6", 
    lg: "h-8 w-8"
  };
  
  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-muted border-t-primary`} />
  );
};

export { Skeleton }