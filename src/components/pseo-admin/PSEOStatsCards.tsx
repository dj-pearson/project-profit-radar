import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PSEODashboardStats } from '@/types/pseo';

interface PSEOStatsCardsProps {
  stats: PSEODashboardStats;
  isLoading: boolean;
}

export function PSEOStatsCards({ stats, isLoading }: PSEOStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Total Pages', value: stats.totalPages, variant: 'default' as const },
    { label: 'Published', value: stats.publishedPages, variant: 'default' as const },
    { label: 'Needs Review', value: stats.pendingReview, variant: 'destructive' as const },
    { label: 'Failed', value: stats.failedPages, variant: 'destructive' as const },
    { label: 'Stale', value: stats.stalePages, variant: 'secondary' as const },
    { label: 'Queue Pending', value: stats.queuePending, variant: 'outline' as const },
    { label: 'Total Views', value: stats.totalViews.toLocaleString(), variant: 'default' as const },
    { label: 'Conversions', value: stats.totalConversions.toLocaleString(), variant: 'default' as const },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{card.value}</span>
              {(card.label === 'Needs Review' || card.label === 'Failed') && Number(card.value) > 0 && (
                <Badge variant={card.variant}>{card.value}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
