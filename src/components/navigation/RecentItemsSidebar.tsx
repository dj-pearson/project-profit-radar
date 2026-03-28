import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  FileText,
  FolderOpen,
  Calculator,
  Users,
  Star,
  Clock,
  Trash2,
} from 'lucide-react';
import { useRecentlyViewed, RecentItem } from '@/hooks/useRecentlyViewed';
import { useSidebar } from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<RecentItem['type'], React.ElementType> = {
  project: Building2,
  invoice: FileText,
  document: FolderOpen,
  estimate: Calculator,
  contact: Users,
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function RecentItemsSidebar() {
  const { recentItems, favorites, toggleFavorite, clearRecent, isFavorite } =
    useRecentlyViewed();
  const { state } = useSidebar();
  const navigate = useNavigate();

  const collapsed = state === 'collapsed';

  // Don't render anything when sidebar is collapsed or there's nothing to show
  if (collapsed || (recentItems.length === 0 && favorites.length === 0)) {
    return null;
  }

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="px-2 pb-2 space-y-1">
      {/* Favorites */}
      {favorites.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold uppercase tracking-wider',
                'text-muted-foreground hover:text-foreground transition-colors rounded-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              aria-label="Toggle favorites section"
            >
              <Star className="h-3 w-3" aria-hidden="true" />
              Favorites
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="space-y-0.5" role="list" aria-label="Favorite items">
              {favorites.map((item) => {
                const Icon = TYPE_ICONS[item.type] || FileText;
                return (
                  <li key={item.path}>
                    <button
                      className={cn(
                        'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm',
                        'hover:bg-accent/50 transition-colors text-left',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      )}
                      onClick={() => handleNavigate(item.path)}
                      aria-label={`Navigate to ${item.name}`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate flex-1 min-w-0">{item.name}</span>
                      <button
                        className={cn(
                          'flex-shrink-0 p-0.5 rounded hover:bg-accent transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item);
                        }}
                        aria-label={`Remove ${item.name} from favorites`}
                      >
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                      </button>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Recent Items */}
      {recentItems.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold uppercase tracking-wider',
                'text-muted-foreground hover:text-foreground transition-colors rounded-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              aria-label="Toggle recent items section"
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              Recent
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="space-y-0.5" role="list" aria-label="Recently viewed items">
              {recentItems.map((item) => {
                const Icon = TYPE_ICONS[item.type] || FileText;
                const favorited = isFavorite(item.path);
                return (
                  <li key={item.path}>
                    <button
                      className={cn(
                        'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm',
                        'hover:bg-accent/50 transition-colors text-left group',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      )}
                      onClick={() => handleNavigate(item.path)}
                      aria-label={`Navigate to ${item.name}, viewed ${formatRelativeTime(item.viewedAt)}`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate text-sm leading-tight">{item.name}</span>
                        <span className="text-xs text-muted-foreground leading-tight">
                          {formatRelativeTime(item.viewedAt)}
                        </span>
                      </div>
                      <button
                        className={cn(
                          'flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                          'hover:bg-accent focus-visible:opacity-100',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item);
                        }}
                        aria-label={favorited ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
                      >
                        <Star
                          className={cn(
                            'h-3 w-3',
                            favorited
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </button>
                  </li>
                );
              })}
            </ul>
            {/* Clear all */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1 h-7 text-xs text-muted-foreground"
              onClick={clearRecent}
              aria-label="Clear recently viewed items"
            >
              <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
              Clear recent
            </Button>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
