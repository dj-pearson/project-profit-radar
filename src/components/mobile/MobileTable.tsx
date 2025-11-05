import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useMediaQuery';

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
  keyExtractor = (item, index) => index.toString(),
}: MobileTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  if (isMobile) {
    // Mobile: Card-based layout
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item, index) => (
          <Card
            key={keyExtractor(item, index)}
            className={cn(
              'p-4',
              onRowClick && 'cursor-pointer active:scale-[0.98] transition-transform'
            )}
            onClick={() => onRowClick?.(item)}
          >
            <div className="space-y-2">
              {columns
                .filter(col => !col.mobileHidden)
                .map((column, colIndex) => {
                  const value = column.render
                    ? column.render(item)
                    : item[column.key as keyof T];

                  return (
                    <div
                      key={`${keyExtractor(item, index)}-${colIndex}`}
                      className={cn(
                        'flex justify-between items-start gap-2',
                        column.mobilePrimary && 'border-b pb-2 mb-2'
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
  keyExtractor = (item, index) => index.toString(),
}: {
  data: T[];
  renderItem: (item: T, index: number) => ReactNode;
  onItemClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  keyExtractor?: (item: T, index: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('divide-y', className)}>
      {data.map((item, index) => (
        <div
          key={keyExtractor(item, index)}
          className={cn(
            'py-3',
            onItemClick && 'cursor-pointer active:bg-muted/50 transition-colors'
          )}
          onClick={() => onItemClick?.(item)}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

/**
 * Horizontal scroll table for mobile (alternative approach)
 */
export function MobileScrollTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  className,
}: Omit<MobileTableProps<T>, 'emptyMessage'>) {
  return (
    <div className={cn('overflow-x-auto -mx-4 px-4', className)}>
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
