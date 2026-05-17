import React from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';
import type { RecentEntityType } from '@/hooks/useRecentItems';

interface FavoriteStarProps {
  entityType: RecentEntityType;
  entityId: string;
  /** Display label stored with the favorite (e.g. the project name). */
  label: string;
  /** Route to navigate to when the favorite is clicked in the sidebar. */
  url: string;
  className?: string;
}

/**
 * Star toggle for pinning an entity to the sidebar "Favorites" section.
 * Drop into any entity detail page header.
 */
export const FavoriteStar: React.FC<FavoriteStarProps> = ({
  entityType,
  entityId,
  label,
  url,
  className,
}) => {
  const { isFavorite, toggleFavorite, isToggling } = useFavorites();
  const active = isFavorite(entityType, entityId);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={isToggling}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      title={active ? 'Remove from favorites' : 'Add to favorites'}
      className={cn('h-9 w-9', className)}
      onClick={() => toggleFavorite({ entityType, entityId, label, url })}
    >
      <Star
        className={cn(
          'h-5 w-5 transition-colors',
          active ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        )}
        aria-hidden="true"
      />
    </Button>
  );
};
