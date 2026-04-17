import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Mobile-shaped skeleton loaders that match the final layout of
 * MobileCard, MobileCardItem, and MobileDashboard so there is no layout
 * shift when real content arrives. Uses glass surfaces + iOS shimmer.
 */

export function MobileSkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'ios-shimmer rounded-2xl glass-thin p-4 min-h-[96px] flex items-center gap-3',
        className,
      )}
    >
      <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
      </div>
      <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
    </div>
  );
}

export function MobileSkeletonListItem({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'ios-shimmer flex items-center gap-3 p-4 min-h-[64px] border-b border-white/10 dark:border-white/5 last:border-b-0',
        className,
      )}
    >
      <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/5 rounded-md" />
        <Skeleton className="h-3 w-2/5 rounded-md" />
      </div>
      <Skeleton className="h-4 w-12 rounded-md flex-shrink-0" />
    </div>
  );
}

export function MobileSkeletonList({
  count = 5,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl glass-thin overflow-hidden', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <MobileSkeletonListItem key={i} />
      ))}
    </div>
  );
}

export function MobileSkeletonStatCard() {
  return (
    <div className="ios-shimmer rounded-2xl glass-thin p-4 min-h-[112px] flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-7 w-24 rounded-md" />
        <Skeleton className="h-3 w-16 rounded-md" />
      </div>
      <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
    </div>
  );
}

/**
 * Full mobile dashboard skeleton: greeting header, 4 stat cards in a 2x2
 * grid, and a list of recent items.
 */
export function MobileSkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 ios-rise', className)} aria-hidden="true">
      <div className="ios-shimmer rounded-2xl glass-thin p-5 space-y-3">
        <Skeleton className="h-6 w-40 rounded-md" />
        <Skeleton className="h-4 w-56 rounded-md" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MobileSkeletonStatCard />
        <MobileSkeletonStatCard />
        <MobileSkeletonStatCard />
        <MobileSkeletonStatCard />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-md" />
        <MobileSkeletonList count={4} />
      </div>
    </div>
  );
}
