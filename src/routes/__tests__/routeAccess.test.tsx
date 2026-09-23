import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import React, { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

/**
 * US-302 AC6: RouteGuard enforces ROUTE_ACCESS. Before this, RouteGuard let
 * all seven roles through every route and ROUTE_ACCESS was read by nothing,
 * so a field_supervisor could open the general ledger with only RLS behind it.
 */

const mockAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth() }));
vi.mock('@/lib/routeMemory', () => ({ rememberCurrentRoute: vi.fn() }));
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));

import { RouteGuard } from '@/components/ProtectedRoute';
import { financialRoutes } from '../financialRoutes';
import {
  ROUTE_ACCESS,
  getRouteRoles,
  getUnauthorizedRedirect,
  hasRouteAccess,
  type UserRole,
} from '@/config/routeConfig';
import * as NavigationConfig from '@/components/navigation/NavigationConfig';
import { hierarchicalNavigation } from '@/components/navigation/HierarchicalNavigationConfig';

const ROLES: UserRole[] = [
  'root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting', 'client_portal',
];

type RouteProps = { path?: string; element?: ReactNode; children?: ReactNode };

function findRoute(tree: ReactNode, path: string): ReactElement<RouteProps> | undefined {
  let found: ReactElement<RouteProps> | undefined;
  React.Children.forEach(tree, (child) => {
    if (found || !isValidElement(child)) return;
    const el = child as ReactElement<RouteProps>;
    if (el.type === Route && el.props.path === path) found = el;
    else if (el.props.children) found = findRoute(el.props.children, path);
  });
  return found;
}

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

function signIn(role: UserRole) {
  mockAuth.mockReturnValue({ user: { id: 'u1' }, userProfile: { id: 'u1', role }, loading: false });
}

/** Renders `guard` at `path`, with the homes it may redirect to mounted beside it. */
function renderAt(path: string, guard: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path.replace(/\/abc\//, '/:projectId/')} element={guard} />
        <Route path="/dashboard" element={<div>DASHBOARD</div>} />
        <Route path="/client-portal" element={<div>PORTAL</div>} />
        <Route path="/auth" element={<div>SIGN IN</div>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

/** The real /finance/general-ledger route element, with a stub page inside its guard. */
function generalLedgerGuard(): ReactElement {
  const route = findRoute(financialRoutes, '/finance/general-ledger');
  expect(route, '/finance/general-ledger is routed in financialRoutes').toBeDefined();
  const element = route!.props.element as ReactElement;
  expect(element.type).toBe(RouteGuard);
  return cloneElement(element, {}, <div>GENERAL LEDGER</div>);
}

describe('RouteGuard enforces ROUTE_ACCESS (US-302)', () => {
  beforeEach(() => {
    mockAuth.mockReset();
    toastError.mockReset();
  });

  it('refuses a field_supervisor at /finance/general-ledger and sends them to their dashboard with a message', () => {
    signIn('field_supervisor');
    renderAt('/finance/general-ledger', generalLedgerGuard());
    expect(screen.queryByText('GENERAL LEDGER')).toBeNull();
    expect(screen.getByText('DASHBOARD')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/dashboard');
    expect(toastError).toHaveBeenCalledTimes(1);
    const [title, opts] = toastError.mock.calls[0] as [string, { description: string }];
    expect(title).toMatch(/don't have access/);
    expect(opts.description).toContain('field supervisor');
    expect(opts.description).toContain('/finance/general-ledger');
  });

  it.each(['accounting', 'admin', 'root_admin'] as UserRole[])('lets %s open /finance/general-ledger', (role) => {
    signIn(role);
    renderAt('/finance/general-ledger', generalLedgerGuard());
    expect(screen.getByText('GENERAL LEDGER')).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });

  it.each(['project_manager', 'office_staff'] as UserRole[])('refuses %s at /finance/general-ledger', (role) => {
    signIn(role);
    renderAt('/finance/general-ledger', generalLedgerGuard());
    expect(screen.queryByText('GENERAL LEDGER')).toBeNull();
    expect(screen.getByText('DASHBOARD')).toBeTruthy();
  });

  it('still sends a client_portal user to the portal, not the contractor dashboard', () => {
    signIn('client_portal');
    renderAt('/finance/general-ledger', generalLedgerGuard());
    expect(screen.getByText('PORTAL')).toBeTruthy();
    expect(screen.queryByText('GENERAL LEDGER')).toBeNull();
  });

  it('still admits a client_portal user to a portalScoped route', () => {
    signIn('client_portal');
    renderAt('/client-portal', <RouteGuard portalScoped><div>PORTAL PAGE</div></RouteGuard>);
    expect(screen.getByText('PORTAL PAGE')).toBeTruthy();
  });

  it('matches :param patterns: accounting is refused /projects/:projectId/tasks/new', () => {
    signIn('accounting');
    renderAt('/projects/abc/tasks/new', <RouteGuard><div>NEW TASK</div></RouteGuard>);
    expect(screen.queryByText('NEW TASK')).toBeNull();
    expect(screen.getByText('DASHBOARD')).toBeTruthy();
    signIn('field_supervisor');
    renderAt('/projects/abc/tasks/new', <RouteGuard><div>FS NEW TASK</div></RouteGuard>);
    expect(screen.getByText('FS NEW TASK')).toBeTruthy();
  });

  it('leaves a route ROUTE_ACCESS does not list open to every non-portal role, as before', () => {
    expect(getRouteRoles('/invoices')).toBeUndefined();
    for (const role of ROLES.filter((r) => r !== 'client_portal')) {
      signIn(role);
      const { unmount } = renderAt('/invoices', <RouteGuard><div>INVOICES</div></RouteGuard>);
      expect(screen.getByText('INVOICES')).toBeTruthy();
      unmount();
    }
  });
});

describe('ROUTE_ACCESS consistency', () => {
  it('every role can open its own home, so a refusal can never loop', () => {
    for (const role of ROLES) {
      const home = getUnauthorizedRedirect(role);
      if (role === 'client_portal') expect(home).toBe('/client-portal');
      else expect(hasRouteAccess(home, role)).toBe(true);
    }
  });

  it('ignores a trailing slash', () => {
    expect(hasRouteAccess('/finance/general-ledger/', 'field_supervisor')).toBe(false);
    expect(hasRouteAccess('/finance/general-ledger/', 'accounting')).toBe(true);
  });

  /**
   * Enforcing ROUTE_ACCESS must not refuse a role a page the navigation shows
   * it a link to. Two nav configs carry their own role lists; this fails if
   * either grants a role that ROUTE_ACCESS would bounce.
   */
  it('grants every role the navigation configs link it to', () => {
    const drift: string[] = [];
    const visit = (node: unknown, source: string) => {
      if (Array.isArray(node)) { node.forEach((n) => visit(n, source)); return; }
      if (!node || typeof node !== 'object') return;
      const item = node as { url?: unknown; roles?: unknown } & Record<string, unknown>;
      if (typeof item.url === 'string' && Array.isArray(item.roles)) {
        for (const role of item.roles as string[]) {
          if (!ROLES.includes(role as UserRole)) continue; // e.g. "foreman": not a real role
          if (!hasRouteAccess(item.url, role as UserRole)) drift.push(`${source} ${item.url} ${role}`);
        }
      }
      for (const [key, value] of Object.entries(item)) if (key !== 'icon') visit(value, source);
    };
    for (const [name, value] of Object.entries(NavigationConfig)) visit(value, `NavigationConfig.${name}`);
    visit(hierarchicalNavigation, 'HierarchicalNavigationConfig');
    expect(drift).toEqual([]);
  });

  /**
   * US-315 deleted /marketplace, /visual-project, /mobile-testing and others,
   * and their ROUTE_ACCESS entries stayed behind granting access to nothing.
   * Every key has to be a path some <Route> in src/routes declares (a page or
   * a <Navigate> redirect), matched literally so :param patterns count.
   */
  it('lists only paths a route in src/routes declares', () => {
    const declared = new Set<string>();
    const dir = 'src/routes';
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
      const src = readFileSync(join(dir, file), 'utf8');
      for (const m of src.matchAll(/<Route\b((?:[^>]|\n)*?)\/?>/g)) {
        const pm = /path=\{?["'`]([^"'`]+)["'`]/.exec(m[1]);
        if (pm) declared.add(pm[1]);
      }
    }
    expect(declared.size).toBeGreaterThan(100);
    const stale = Object.keys(ROUTE_ACCESS).filter((path) => !declared.has(path));
    expect(stale).toEqual([]);
    for (const gone of ['/marketplace', '/visual-project', '/mobile-testing', '/login']) {
      expect(ROUTE_ACCESS[gone], gone).toBeUndefined();
    }
  });

  it('lists only real roles', () => {
    for (const [path, roles] of Object.entries(ROUTE_ACCESS)) {
      for (const role of roles) expect(ROLES, `${path} lists ${role}`).toContain(role);
    }
  });
});
