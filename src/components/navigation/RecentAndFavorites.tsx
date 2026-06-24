import React from 'react';
import { NavLink } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Building2,
  Receipt,
  FileText,
  User,
  Calculator,
  FileQuestion,
  Star,
  Clock,
} from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useRecentItems, type RecentEntityType } from '@/hooks/useRecentItems';
import { useFavorites } from '@/hooks/useFavorites';

const ICONS: Record<RecentEntityType, React.ComponentType<{ className?: string }>> = {
  project: Building2,
  invoice: Receipt,
  document: FileText,
  contact: User,
  estimate: Calculator,
  page: FileQuestion,
};

const EntityIcon: React.FC<{ type: string; className?: string }> = ({
  type,
  className,
}) => {
  const Icon = ICONS[(type as RecentEntityType)] ?? FileQuestion;
  return <Icon className={className} aria-hidden="true" />;
};

interface RecentAndFavoritesProps {
  /** Hide labels when the sidebar is in icon-only collapsed mode. */
  collapsed?: boolean;
}

export const RecentAndFavorites: React.FC<RecentAndFavoritesProps> = ({
  collapsed = false,
}) => {
  const { recentItems } = useRecentItems();
  const { favorites } = useFavorites();

  // Nothing pinned and nothing visited yet — render nothing rather than an
  // empty section.
  if (collapsed || (favorites.length === 0 && recentItems.length === 0)) {
    return null;
  }

  return (
    <>
      {favorites.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            Favorites
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {favorites.map((fav) => (
                <SidebarMenuItem key={fav.id}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink
                      to={fav.entity_url}
                      className="flex items-center gap-2 px-2 min-w-0"
                    >
                      <EntityIcon
                        type={fav.entity_type}
                        className="h-4 w-4 flex-shrink-0"
                      />
                      <span className="truncate text-sm flex-1 min-w-0">
                        {fav.entity_label}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {recentItems.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Recent
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recentItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild className="h-auto py-1.5">
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 px-2 min-w-0"
                    >
                      <EntityIcon
                        type={item.type}
                        className="h-4 w-4 flex-shrink-0"
                      />
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="truncate text-sm w-full leading-tight">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {formatDistanceToNow(item.timestamp, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  );
};
