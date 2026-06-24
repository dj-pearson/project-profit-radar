import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb';

interface AutoBreadcrumbProps {
  /**
   * Human-readable label for the current page. Detail pages pass the entity
   * name here (e.g. the project name) so an id segment renders as
   * "Projects > Riverside Apartments" instead of a raw UUID.
   */
  currentLabel?: string;
}

// Slugs whose title-cased form reads badly or has an established product name.
const LABEL_MAP: Record<string, string> = {
  'projects-hub': 'Projects',
  'financial-hub': 'Financial',
  'people-hub': 'People',
  'operations-hub': 'Operations',
  'admin-hub': 'Admin',
  rfis: 'RFIs',
  '1099s': '1099s',
  'job-costing': 'Job Costing',
  crm: 'CRM',
  qa: 'QA',
  api: 'API',
  'api-marketplace': 'API Marketplace',
  ai: 'AI',
  seo: 'SEO',
};

// A path segment is treated as an entity id (not a navigable page name) when
// it is a UUID, all-numeric, or a long opaque token.
const isIdSegment = (seg: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) ||
  /^\d+$/.test(seg) ||
  /^[0-9a-z]{20,}$/i.test(seg);

const humanize = (seg: string): string =>
  LABEL_MAP[seg] ??
  seg
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

interface Crumb {
  label: string;
  href: string;
  isCurrent: boolean;
}

export const AutoBreadcrumb: React.FC<AutoBreadcrumbProps> = ({ currentLabel }) => {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  // Top-level pages (0–1 segments) don't need a breadcrumb trail.
  if (segments.length < 2) return null;

  const crumbs: Crumb[] = [];
  let acc = '';
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const isLast = i === segments.length - 1;
    let label: string;
    if (isLast && currentLabel) {
      label = currentLabel;
    } else if (isIdSegment(seg)) {
      // Intermediate id with no provided name — fall back to the parent's
      // singular noun so the trail stays readable.
      const parent = segments[i - 1];
      label = parent ? humanize(parent).replace(/s$/, '') + ' Detail' : 'Detail';
    } else {
      label = humanize(seg);
    }
    crumbs.push({ label, href: acc, isCurrent: isLast });
  });

  // Prepend Dashboard as the root.
  const trail: Crumb[] = [
    { label: 'Dashboard', href: '/dashboard', isCurrent: false },
    ...crumbs,
  ];

  // On narrow screens collapse the middle of long trails to an ellipsis,
  // always keeping the root, the immediate parent, and the current page.
  const COLLAPSE_AFTER = 4;
  const collapsed = trail.length > COLLAPSE_AFTER;

  const renderItem = (c: Crumb, key: React.Key) => (
    <React.Fragment key={key}>
      <BreadcrumbItem>
        {c.isCurrent ? (
          <BreadcrumbPage className="max-w-[12rem] truncate sm:max-w-[20rem]">
            {c.label}
          </BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <Link
              to={c.href}
              className="max-w-[8rem] truncate sm:max-w-none"
            >
              {c.label}
            </Link>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
      {!c.isCurrent && <BreadcrumbSeparator />}
    </React.Fragment>
  );

  return (
    <Breadcrumb aria-label="Breadcrumb" className="mb-3 md:mb-4">
      <BreadcrumbList>
        {/* Root with Home icon */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard" aria-label="Dashboard" className="flex items-center">
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Dashboard</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {collapsed ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {renderItem(trail[trail.length - 2], 'parent')}
            {renderItem(trail[trail.length - 1], 'current')}
          </>
        ) : (
          // Skip index 0 (root) — already rendered as the Home icon above.
          trail.slice(1).map((c, i) => renderItem(c, i))
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
