import { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { MobileEmptyState } from './MobileEmptyState';
import {
  LIST_SURFACE_CLASSES,
  ROW_SURFACE_CLASSES,
  resolveTableSurface,
  type MobileTableSurface,
} from './mobileTableSurface';

export type { MobileTableSurface };

export interface MobileTableEmptyState {
  icon?: LucideIcon;
  title: string;
  description: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  accentClass?: string;
}

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
  mobileHidden?: boolean; // Hide this column on mobile
  mobilePrimary?: boolean; // Show prominently on mobile
}

interface MobileTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  /** Visual surface for the mobile card rows. Defaults to `'auto'`. */
  surface?: MobileTableSurface;
  /**
   * Rich empty state. When provided, renders a MobileEmptyState (illustrated
   * icon medallion, title, description, CTAs) instead of the plain
   * emptyMessage text.
   */
  emptyState?: MobileTableEmptyState;
  keyExtractor?: (item: T, index: number) => string;
}

/**
 * Mobile-first table that transforms into cards on small screens
 */
export function MobileTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  className,
  emptyMessage = 'No data available',
  emptyState,
  surface = 'auto',
  keyExtractor = (item, index) => index.toString(),
}: MobileTableProps<T>) {
  const isMobile = useIsMobile();
  const visibleColumns = columns.filter(col => !col.mobileHidden);
  const resolvedSurface = resolveTableSurface(surface, visibleColumns.length);

  if (data.length === 0) {
    if (emptyState) {
      return (
        <MobileEmptyState
          icon={emptyState.icon ?? Inbox}
          title={emptyState.title}
          description={emptyState.description}
          primaryLabel={emptyState.primaryLabel}
          onPrimary={emptyState.onPrimary}
          secondaryLabel={emptyState.secondaryLabel}
          onSecondary={emptyState.onSecondary}
          accentClass={emptyState.accentClass}
        />
      );
    }
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  if (isMobile) {
    // Mobile: card-based layout. Glass by default, solid once the row carries
    // enough columns that legibility beats the frosted look (US-143).
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item, index) => (
          <Card
            key={keyExtractor(item, index)}
            className={cn(
              'rounded-2xl p-4',
              ROW_SURFACE_CLASSES[resolvedSurface],
              onRowClick &&
                'cursor-pointer ios-press transition-all duration-[200ms] ease-ios tap-highlight-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            )}
            onClick={() => onRowClick?.(item)}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
          >
            <div className="space-y-2">
              {visibleColumns
                .map((column, colIndex) => {
                  const value = column.render
                    ? column.render(item)
                    : item[column.key as keyof T];

                  return (
                    <div
                      key={`${keyExtractor(item, index)}-${colIndex}`}
                      className={cn(
                        'flex justify-between items-start gap-2',
                        column.mobilePrimary && 'border-b pb-2 mb-2',
                        column.mobilePrimary &&
                          (resolvedSurface === 'solid'
                            ? 'border-border'
                            : 'border-white/10 dark:border-white/5')
                      )}
                    >
                      <span className="text-sm text-muted-foreground font-medium">
                        {column.label}:
                      </span>
                      <span
                        className={cn(
                          'text-sm text-right',
                          column.mobilePrimary && 'font-semibold text-base',
                          column.className
                        )}
                      >
                        {value}
                      </span>
                    </div>
                  );
                })}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop: Traditional table layout
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead className="border-b">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(
                  'text-left p-4 text-sm font-semibold text-muted-foreground',
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={keyExtractor(item, index)}
              className={cn(
                'border-b last:border-0',
                onRowClick && 'cursor-pointer hover:bg-muted/50 transition-colors'
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column, colIndex) => {
                const value = column.render
                  ? column.render(item)
                  : item[column.key as keyof T];

                return (
                  <td
                    key={`${keyExtractor(item, index)}-${colIndex}`}
                    className={cn('p-4 text-sm', column.className)}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Simplified mobile-only list view
 */
export function MobileList<T extends Record<string, any>>({
  data,
  renderItem,
  onItemClick,
  className,
  emptyMessage = 'No items',
  emptyState,
  surface = 'glass',
  keyExtractor = (item, index) => index.toString(),
}: {
  data: T[];
  renderItem: (item: T, index: number) => ReactNode;
  onItemClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  emptyState?: MobileTableEmptyState;
  /**
   * Rows are rendered by the caller, so density can't be inferred — pass
   * `'solid'` for dense numeric lists (US-143). `'auto'` behaves as `'glass'`.
   */
  surface?: MobileTableSurface;
  keyExtractor?: (item: T, index: number) => string;
}) {
  const resolvedSurface = surface === 'solid' ? 'solid' : 'glass';
  if (data.length === 0) {
    if (emptyState) {
      return (
        <MobileEmptyState
          icon={emptyState.icon ?? Inbox}
          title={emptyState.title}
          description={emptyState.description}
          primaryLabel={emptyState.primaryLabel}
          onPrimary={emptyState.onPrimary}
          secondaryLabel={emptyState.secondaryLabel}
          onSecondary={emptyState.onSecondary}
          accentClass={emptyState.accentClass}
        />
      );
    }
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'divide-y rounded-2xl overflow-hidden',
        LIST_SURFACE_CLASSES[resolvedSurface],
        className
      )}
    >
      {data.map((item, index) => (
        <div
          key={keyExtractor(item, index)}
          className={cn(
            'py-3 px-4',
            onItemClick &&
              'cursor-pointer active:bg-foreground/5 transition-colors duration-[150ms] ease-ios tap-highlight-transparent'
          )}
          onClick={() => onItemClick?.(item)}
          role={onItemClick ? 'button' : undefined}
          tabIndex={onItemClick ? 0 : undefined}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

/**
 * Horizontal scroll table for mobile (alternative approach).
 *
 * Always solid: a 600px-wide scrolling grid of values is the densest surface in
 * the app, and glass under it costs legibility for nothing (US-143).
 */
export function MobileScrollTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  className,
}: Omit<MobileTableProps<T>, 'emptyMessage' | 'surface'>) {
  return (
    <div
      className={cn(
        'overflow-x-auto -mx-4 px-4 rounded-2xl bg-card text-card-foreground',
        className
      )}
    >
      <table className="w-full min-w-[600px]">
        <thead className="border-b bg-muted/50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(
                  'text-left p-3 text-sm font-semibold whitespace-nowrap',
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              className={cn(
                'border-b last:border-0',
                onRowClick && 'cursor-pointer active:bg-muted/50 transition-colors'
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column, colIndex) => {
                const value = column.render
                  ? column.render(item)
                  : item[column.key as keyof T];

                return (
                  <td
                    key={colIndex}
                    className={cn('p-3 text-sm whitespace-nowrap', column.className)}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
