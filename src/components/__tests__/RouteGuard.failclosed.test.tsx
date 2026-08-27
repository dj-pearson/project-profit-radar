import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/**
 * The route guard that actually runs (US-302).
 *
 * There used to be two ProtectedRoute modules. src/components/auth/
 * ProtectedRoute.tsx exported ProtectedRoute/RoleProtectedRoute/
 * RequirePermission, sat under the more canonical-looking path, and was
 * imported by nothing but its own test - it had fail-open role checks
 * (`role && !allowedRoles.includes(role)`, which skips the comparison entirely
 * for a null role) until they were fixed. Keeping a fixed-but-dead guard is
 * still the hazard: it reads as protection and gets adopted on the strength of
 * its name.
 *
 * It is deleted, and the assurance moved here, onto RouteGuard in
 * src/components/ProtectedRoute.tsx - the one wired into all five route files.
 */

const mockAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth() }));
vi.mock('@/lib/routeMemory', () => ({ rememberCurrentRoute: vi.fn() }));

import { RouteGuard, ProtectedRoute } from '../ProtectedRoute';

const user = { id: 'u1' };

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <RouteGuard>
              <div>PROTECTED</div>
            </RouteGuard>
          }
        />
        <Route path="/auth" element={<div>SIGN IN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RouteGuard fails closed', () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.useRealTimers();
  });

  it('redirects when there is no user', () => {
    mockAuth.mockReturnValue({ user: null, userProfile: null, loading: false });
    renderGuard();
    expect(screen.getByText('SIGN IN')).toBeTruthy();
    expect(screen.queryByText('PROTECTED')).toBeNull();
  });

  it('does not render children while auth is still loading', () => {
    mockAuth.mockReturnValue({ user: null, userProfile: null, loading: true });
    renderGuard();
    expect(screen.queryByText('PROTECTED')).toBeNull();
  });

  it('holds, rather than admitting, a user whose profile has not loaded', () => {
    mockAuth.mockReturnValue({ user, userProfile: null, loading: false });
    renderGuard();
    expect(screen.queryByText('PROTECTED')).toBeNull();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['an unknown role', 'superuser'],
  ])('denies a signed-in user whose role is %s', (_label, role) => {
    mockAuth.mockReturnValue({ user, userProfile: { id: 'u1', role }, loading: false });
    renderGuard();
    // The fail-open shape this pins against is `role && !allowed.includes(role)`,
    // which skips the comparison for every falsy role and lets it through.
    expect(screen.queryByText('PROTECTED')).toBeNull();
  });

  it.each([
    'root_admin',
    'admin',
    'project_manager',
    'field_supervisor',
    'office_staff',
    'accounting',
    'client_portal',
  ])('admits %s', (role) => {
    mockAuth.mockReturnValue({ user, userProfile: { id: 'u1', role }, loading: false });
    renderGuard();
    expect(screen.getByText('PROTECTED')).toBeTruthy();
  });

  it('exports ProtectedRoute as an alias of RouteGuard, so the legacy name is the same guard', () => {
    expect(ProtectedRoute).toBe(RouteGuard);
  });
});
