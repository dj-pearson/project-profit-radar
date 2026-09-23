import {
  Building2,
  DollarSign,
  FileText,
  ListTodo,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface MobileNavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  roles?: string[];
  badge?: string | number;
}

/**
 * The project id from a project-scoped path (`/projects/:projectId` and
 * anything under it), or null. `/projects` itself and `/projects-hub` are not
 * project-scoped.
 */
export function projectIdFromPath(pathname: string): string | null {
  const match = /^\/projects\/([^/?#]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Bottom-nav items for one project. Every link stays inside
 * `/projects/:projectId`; the hash picks the hub section (ids from
 * src/components/project/projectSections.ts), which is how ProjectDetail
 * selects its tab. These used to point at the global /documents,
 * /job-costing, /schedule-management and /change-orders pages, so a field
 * user tapping "Costs" on a project lost the project.
 */
export function projectContextNavItems(projectId: string): MobileNavItem[] {
  const base = `/projects/${encodeURIComponent(projectId)}`;
  return [
    { icon: Building2, label: 'Overview', href: base },
    { icon: ListTodo, label: 'Tasks', href: `${base}#tasks` },
    { icon: DollarSign, label: 'Costs', href: `${base}#jobcosting` },
    { icon: Wrench, label: 'Changes', href: `${base}#changeorders` },
    { icon: FileText, label: 'Documents', href: `${base}#documents` },
  ];
}

/**
 * Active check that understands hash-addressed project sections: a link with
 * a hash is active only on that exact path + hash; the bare project link is
 * active on the overview (no hash or #overview). Links without a hash keep
 * the old prefix match, with /dashboard exact.
 */
export function isMobileNavItemActive(
  href: string,
  pathname: string,
  hash = ''
): boolean {
  const hashIndex = href.indexOf('#');
  if (hashIndex >= 0) {
    return pathname === href.slice(0, hashIndex) && hash === href.slice(hashIndex);
  }
  if (href === '/dashboard') return pathname === href;
  if (projectIdFromPath(href) && pathname === href) {
    return hash === '' || hash === '#overview';
  }
  return pathname.startsWith(href);
}
