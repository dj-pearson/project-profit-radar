import { describe, it, expect } from 'vitest';
import React, { isValidElement, type ReactElement, type ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { appRoutes } from '../appRoutes';
import { financialRoutes } from '../financialRoutes';
import { projectRoutes } from '../projectRoutes';
import { peopleRoutes } from '../peopleRoutes';
import { operationsRoutes } from '../operationsRoutes';
import { adminRoutes } from '../adminRoutes';

/**
 * US-350: every authenticated app route sits behind a guard. Thirteen routes
 * in appRoutes and one in financialRoutes were mounted bare, so a signed-out
 * visitor got the page shell and whatever it fetched before RLS said no.
 *
 * Public on purpose, each for a reason written next to the route:
 */
const PUBLIC_PATHS = new Set([
  '/', '/auth', '/auth/callback',
  '/estimate/:token', // prospect with no account; the token is the credential (US-325)
  '/checkout/success', '/payment-success', '/payment-cancelled', // Stripe return pages
  '/tools', '/resources', '/resources/:slug', // marketing content
  '/accessibility', '/accessibility-statement', // the accessibility statement is public by law and design
]);

const GUARD_NAMES = new Set(['RouteGuard', 'RoleGuard', 'SecureRoute', 'ProtectedRoute', 'AdminRoute']);

type RouteProps = { path?: string; element?: ReactNode; children?: ReactNode; index?: boolean };

function collectRoutes(node: ReactNode, out: ReactElement<RouteProps>[] = []): ReactElement<RouteProps>[] {
  React.Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<RouteProps>;
    if (el.type === Route) out.push(el);
    if (el.props.children) collectRoutes(el.props.children, out);
  });
  return out;
}

function componentName(el: ReactNode): string {
  if (!isValidElement(el)) return String(el);
  const t = el.type as { displayName?: string; name?: string } | string;
  return typeof t === 'string' ? t : t.displayName || t.name || 'Anonymous';
}

describe('route guards (US-350)', () => {
  const groups = { appRoutes, financialRoutes, projectRoutes, peopleRoutes, operationsRoutes, adminRoutes };

  for (const [name, tree] of Object.entries(groups)) {
    it(`every authenticated route in ${name} is guarded`, () => {
      const unguarded = collectRoutes(tree)
        .filter((r) => r.props.path && r.props.element)
        .filter((r) => !PUBLIC_PATHS.has(r.props.path!))
        .filter((r) => (r.props.element as ReactElement).type !== Navigate)
        .filter((r) => !GUARD_NAMES.has(componentName(r.props.element)))
        .map((r) => `${r.props.path} -> ${componentName(r.props.element)}`);
      expect(unguarded).toEqual([]);
    });
  }

  it('only the portal and the profile page are open to client_portal users', () => {
    const scoped = collectRoutes(appRoutes)
      .filter((r) => isValidElement(r.props.element) && (r.props.element as ReactElement<{ portalScoped?: boolean }>).props.portalScoped)
      .map((r) => r.props.path);
    expect(scoped.sort()).toEqual(['/client-portal', '/profile']);
  });
});
