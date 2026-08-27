import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// These guards must deny when the role is missing, not just when it is wrong.
// Both checks used to read `role && !allowedRoles.includes(role)`, which skipped
// the comparison entirely for a null or undefined role — so a signed-in user
// whose profile had not loaded passed every role gate.

const mockAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth() }));
vi.mock('@/components/loading/LoadingSpinner', () => ({
  PageLoading: ({ message }: { message?: string }) => <div>{message ?? 'loading'}</div>,
}));

import { RoleProtectedRoute, RequirePermission } from '../ProtectedRoute';

const user = { id: 'u1' };

function renderRoleRoute(allowedRoles: string[]) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<RoleProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/admin" element={<div>ADMIN AREA</div>} />
        </Route>
        <Route path="/unauthorized" element={<div>DENIED</div>} />
        <Route path="/auth" element={<div>SIGN IN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoleProtectedRoute fails closed', () => {
  beforeEach(() => mockAuth.mockReset());

  it('denies a signed-in user whose role is null', () => {
    mockAuth.mockReturnValue({ user, role: null, isLoading: false });
    renderRoleRoute(['admin']);
    expect(screen.getByText('DENIED')).toBeTruthy();
  });

  it('denies a signed-in user whose role is undefined', () => {
    mockAuth.mockReturnValue({ user, role: undefined, isLoading: false });
    renderRoleRoute(['admin']);
    expect(screen.getByText('DENIED')).toBeTruthy();
  });

  it('denies a signed-in user holding the wrong role', () => {
    mockAuth.mockReturnValue({ user, role: 'office_staff', isLoading: false });
    renderRoleRoute(['admin']);
    expect(screen.getByText('DENIED')).toBeTruthy();
  });

  it('still admits a user holding an allowed role', () => {
    mockAuth.mockReturnValue({ user, role: 'admin', isLoading: false });
    renderRoleRoute(['admin']);
    expect(screen.getByText('ADMIN AREA')).toBeTruthy();
  });

  it('sends an unauthenticated visitor to sign in', () => {
    mockAuth.mockReturnValue({ user: null, role: null, isLoading: false });
    renderRoleRoute(['admin']);
    expect(screen.getByText('SIGN IN')).toBeTruthy();
  });
});

describe('RequirePermission fails closed', () => {
  beforeEach(() => mockAuth.mockReset());

  const subject = (
    <RequirePermission allowedRoles={['admin']} fallback={<div>HIDDEN</div>}>
      <div>SECRET</div>
    </RequirePermission>
  );

  it('hides content when the role is missing', () => {
    mockAuth.mockReturnValue({ user, role: null, isLoading: false });
    render(subject);
    expect(screen.getByText('HIDDEN')).toBeTruthy();
  });

  it('hides content when the role is wrong', () => {
    mockAuth.mockReturnValue({ user, role: 'accounting', isLoading: false });
    render(subject);
    expect(screen.getByText('HIDDEN')).toBeTruthy();
  });

  it('shows content to an allowed role', () => {
    mockAuth.mockReturnValue({ user, role: 'admin', isLoading: false });
    render(subject);
    expect(screen.getByText('SECRET')).toBeTruthy();
  });
});
