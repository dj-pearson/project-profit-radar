import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock supabase client
const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockRefreshSession = vi.fn();
const mockGetUser = vi.fn();

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: vi.fn((table: string) => {
      if (table === 'user_profiles') {
        return { select: mockSelect, update: mockUpdate };
      }
      return { select: vi.fn() };
    }),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
  getEdgeFunctionUrl: (fn: string) => `https://api.build-desk.com/functions/v1/${fn}`,
  supabaseAnonKey: 'test-anon-key',
}));

// Mock hooks/services
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useGoogleAnalytics', () => ({
  gtag: { trackAuth: vi.fn() },
}));

vi.mock('@/lib/routeMemory', () => ({
  clearRememberedRoute: vi.fn(),
}));

vi.mock('@/lib/sentry', () => ({
  setSentryUser: vi.fn(),
  clearSentryUser: vi.fn(),
}));

vi.mock('@/services/errorLoggingService', () => ({
  setErrorLoggingUser: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/security/loginProtection', () => ({
  checkLoginAttempt: vi.fn().mockResolvedValue({ allowed: true }),
  recordFailedLogin: vi.fn().mockResolvedValue({ allowed: true }),
  clearFailedAttempts: vi.fn().mockResolvedValue(undefined),
  getLockoutMessage: vi.fn().mockReturnValue('Account locked'),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockUser = (overrides = {}) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01',
  ...overrides,
});

const mockSession = (overrides = {}) => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: mockUser(),
  ...overrides,
});

const mockProfile = (role = 'admin' as string) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  phone: null,
  company_id: '660e8400-e29b-41d4-a716-446655440001',
  role,
  is_active: true,
});

let authStateCallback: ((event: string, session: unknown) => void) | null = null;

function setupDefaultMocks(options?: { hasSession?: boolean; role?: string }) {
  const hasSession = options?.hasSession ?? false;
  const role = options?.role ?? 'admin';

  mockOnAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
    authStateCallback = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });

  if (hasSession) {
    mockGetSession.mockResolvedValue({
      data: { session: mockSession() },
      error: null,
    });
    mockMaybeSingle.mockResolvedValue({
      data: mockProfile(role),
      error: null,
    });
    mockRpc.mockResolvedValue({ data: role, error: null });
  } else {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  }

  mockSignOut.mockResolvedValue({ error: null });
}

// Wrapper component for renderHook
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── useAuth hook ────────────────────────────────────────────────────────

  describe('useAuth()', () => {
    it('throws when used outside AuthProvider', () => {
      // Suppress console.error from React
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
      spy.mockRestore();
    });
  });

  // ── Initial unauthenticated state ───────────────────────────────────────

  describe('initial unauthenticated state', () => {
    it('sets user and session to null when no session exists', async () => {
      setupDefaultMocks({ hasSession: false });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.userProfile).toBeNull();
    });

    it('calls supabase.auth.getSession on mount', async () => {
      setupDefaultMocks({ hasSession: false });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalledTimes(1);
      });
    });

    it('sets up auth state change listener', async () => {
      setupDefaultMocks({ hasSession: false });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── Authenticated state ─────────────────────────────────────────────────

  describe('authenticated state', () => {
    it('sets user and session when session exists', async () => {
      setupDefaultMocks({ hasSession: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.current.session).not.toBeNull();
    });

    it('fetches user profile after getting session', async () => {
      setupDefaultMocks({ hasSession: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      expect(result.current.userProfile?.email).toBe('test@example.com');
      expect(result.current.userProfile?.role).toBe('admin');
    });

    it('caches profile to sessionStorage', async () => {
      setupDefaultMocks({ hasSession: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      const cached = sessionStorage.getItem(
        'bd.userProfile.550e8400-e29b-41d4-a716-446655440000'
      );
      expect(cached).not.toBeNull();
      const parsed = JSON.parse(cached!);
      expect(parsed.email).toBe('test@example.com');
    });
  });

  // ── Sign In ─────────────────────────────────────────────────────────────

  describe('signIn()', () => {
    it('calls supabase signInWithPassword with email and password', async () => {
      setupDefaultMocks({ hasSession: false });
      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser(), session: mockSession() },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('returns error message on failed sign in', async () => {
      setupDefaultMocks({ hasSession: false });
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      let response: { error?: string } = {};
      await act(async () => {
        response = await result.current.signIn('bad@example.com', 'wrong');
      });

      expect(response.error).toContain('Invalid credentials');
    });

    it('returns error when login is locked out', async () => {
      setupDefaultMocks({ hasSession: false });

      const { checkLoginAttempt } = await import('@/lib/security/loginProtection');
      (checkLoginAttempt as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        allowed: false,
        remainingAttempts: 0,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      let response: { error?: string } = {};
      await act(async () => {
        response = await result.current.signIn('locked@example.com', 'pass');
      });

      expect(response.error).toBe('Account locked');
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it('handles unexpected exceptions gracefully', async () => {
      setupDefaultMocks({ hasSession: false });
      mockSignInWithPassword.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      let response: { error?: string } = {};
      await act(async () => {
        response = await result.current.signIn('test@example.com', 'pass');
      });

      expect(response.error).toBe('An unexpected error occurred');
    });
  });

  // ── Sign Out ────────────────────────────────────────────────────────────

  describe('signOut()', () => {
    it('clears user, session, and profile on sign out', async () => {
      setupDefaultMocks({ hasSession: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.userProfile).toBeNull();
    });

    it('calls supabase.auth.signOut', async () => {
      setupDefaultMocks({ hasSession: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('clears state even when supabase signOut errors', async () => {
      setupDefaultMocks({ hasSession: true });
      mockSignOut.mockResolvedValueOnce({ error: { message: 'Network error' } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.userProfile).toBeNull();
    });
  });

  // ── Sign Up ─────────────────────────────────────────────────────────────

  describe('signUp()', () => {
    it('calls signup edge function with user data', async () => {
      setupDefaultMocks({ hasSession: false });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ userId: 'new-user-id', expiresInMinutes: 15 }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123', {
          first_name: 'New',
          last_name: 'User',
        });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('signup-with-otp'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('new@example.com'),
        })
      );
    });

    it('returns error on failed signup', async () => {
      setupDefaultMocks({ hasSession: false });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Email already registered' }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      let response: { error?: string } = {};
      await act(async () => {
        response = await result.current.signUp('existing@example.com', 'pass');
      });

      expect(response.error).toBe('Email already registered');
    });
  });

  // ── Reset Password ──────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('calls reset-password-otp edge function', async () => {
      setupDefaultMocks({ hasSession: false });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ expiresInMinutes: 15 }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      await act(async () => {
        await result.current.resetPassword('user@example.com');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('reset-password-otp'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('user@example.com'),
        })
      );
    });

    it('returns error on failed reset', async () => {
      setupDefaultMocks({ hasSession: false });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'User not found' }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      let response: { error?: string } = {};
      await act(async () => {
        response = await result.current.resetPassword('nobody@example.com');
      });

      expect(response.error).toBe('User not found');
    });
  });

  // ── Role Testing ────────────────────────────────────────────────────────

  describe('user roles', () => {
    const roles = [
      'admin',
      'project_manager',
      'field_supervisor',
      'office_staff',
      'accounting',
      'client_portal',
    ] as const;

    roles.forEach((role) => {
      it(`loads profile with "${role}" role correctly`, async () => {
        setupDefaultMocks({ hasSession: true, role });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => {
          expect(result.current.userProfile).not.toBeNull();
        });

        expect(result.current.userProfile?.role).toBe(role);
      });
    });
  });

  // ── Auth state change handling ──────────────────────────────────────────

  describe('auth state change listener', () => {
    it('clears state on SIGNED_OUT event', async () => {
      setupDefaultMocks({ hasSession: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.userProfile).not.toBeNull();
      });

      // Simulate sign-out event
      await act(async () => {
        authStateCallback?.('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.userProfile).toBeNull();
      });
    });
  });

  // ── Auth initialization errors ──────────────────────────────────────────

  describe('error handling', () => {
    it('handles getSession error gracefully', async () => {
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Auth service unavailable' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      // Should not crash, user stays null
      expect(result.current.user).toBeNull();
    });

    it('handles profile fetch failure', async () => {
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      mockGetSession.mockResolvedValue({
        data: { session: mockSession() },
        error: null,
      });
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST500' },
      });
      mockRpc.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      }, { timeout: 15000 });

      // User is set from session but profile may be null
      expect(result.current.user).not.toBeNull();
    });

    it('handles network error on getSession', async () => {
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      mockGetSession.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      expect(result.current.user).toBeNull();
    });
  });

  // ── Context value shape ─────────────────────────────────────────────────

  describe('context value shape', () => {
    it('provides all expected methods and properties', async () => {
      setupDefaultMocks({ hasSession: false });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBeFalsy();
      });

      // Check all expected properties exist
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('userProfile');
      expect(result.current).toHaveProperty('loading');
      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signInWithGoogle).toBe('function');
      expect(typeof result.current.signInWithApple).toBe('function');
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.resetPassword).toBe('function');
      expect(typeof result.current.updateProfile).toBe('function');
      expect(typeof result.current.refreshProfile).toBe('function');
      expect(typeof result.current.sendOTP).toBe('function');
      expect(typeof result.current.verifyOTP).toBe('function');
      expect(typeof result.current.resendOTP).toBe('function');
      expect(typeof result.current.resetPasswordWithOTP).toBe('function');
    });
  });
});
