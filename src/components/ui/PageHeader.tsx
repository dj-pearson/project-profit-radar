import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  /** The page's one <h1>. */
  title: React.ReactNode;
  /** One line under the title saying what the page is for. */
  description?: React.ReactNode;
  /** Rendered above the title, e.g. <AutoBreadcrumb />. */
  breadcrumb?: React.ReactNode;
  /** Page-level buttons, right-aligned on wide screens and wrapped below the title on narrow ones. */
  actions?: React.ReactNode;
  /** id on the <h1>, so a landmark can point aria-labelledby at it. */
  titleId?: string;
  className?: string;
}

/**
 * The single page header for app pages. DashboardLayout renders it from its
 * `title`/`description`/`headerActions` props, so pages inside the layout
 * should not render their own <h1>.
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  titleId = 'page-title',
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)} data-slot="page-header">
      {breadcrumb}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1
            id={titleId}
            className="text-2xl font-semibold tracking-tight text-foreground break-words"
          >
            {title}
          </h1>
          {description ? (
            <div className="max-w-prose text-sm text-muted-foreground sm:text-base">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PageHeader;
