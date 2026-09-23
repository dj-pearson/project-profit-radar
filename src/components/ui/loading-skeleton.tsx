import { cn } from "@/lib/utils"
import { LoadingSpinner as CanonicalSpinner } from "@/components/ui/loading-spinner";

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

/**
 * Re-export of the canonical spinner under this module's older size names, so
 * the callers that import it from here keep working. New code should import
 * LoadingSpinner from @/components/ui/loading-spinner directly.
 */
export const LoadingSpinner = ({ size = "default" }: { size?: "sm" | "default" | "lg" }) => (
  <CanonicalSpinner size={size === "lg" ? "md" : "sm"} />
);

export { Skeleton }