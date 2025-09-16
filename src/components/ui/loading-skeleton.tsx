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

// Common skeleton patterns
export const TableSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[80px]" />
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-6 w-[250px]" />
    <Skeleton className="h-4 w-[300px]" />
    <Skeleton className="h-4 w-[200px]" />
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-6 border rounded-lg">
          <Skeleton className="h-4 w-[100px] mb-2" />
          <Skeleton className="h-8 w-[80px]" />
        </div>
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="p-6 border rounded-lg">
        <Skeleton className="h-6 w-[150px] mb-4" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
      <div className="p-6 border rounded-lg">
        <Skeleton className="h-6 w-[150px] mb-4" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export { Skeleton }