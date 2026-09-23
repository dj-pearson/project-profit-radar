import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext';
import { MFA_PENDING_KEY } from '@/lib/auth/mfaChallenge';

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
  getEdgeFunctionUrl: (fn: string) => `https://api.brikly.net/functions/v1/${fn}`,
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

// ─── MFA gate (US-346) ───────────────────────────────────────────────────────

const fetchMock = vi.fn();

function mfaResponses(opts: { required: boolean; trusted?: boolean; fail?: boolean }) {
  fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
    if (opts.fail) return new Response('{"success":false,"error":"boom"}', { status: 500 });
    const body = JSON.parse(String(init.body));
    if (body.action === 'check') {
      return new Response(JSON.stringify({ success: true, mfaRequired: opts.required }), { status: 200 });
    }
    if (body.action === 'check_trusted_device') {
      return new Response(JSON.stringify({ success: true, isTrusted: !!opts.trusted }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  });
}

// signInWithPassword fires SIGNED_IN through the listener before it resolves,
// as supabase-js does. The gate has to hold that event.
function signInFiresEvent() {
  mockSignInWithPassword.mockImplementation(async () => {
    authStateCallback?.('SIGNED_IN', mockSession());
    return { data: { user: mockUser(), session: mockSession() }, error: null };
  });
}

async function renderSignedOut() {
  setupDefaultMocks({ hasSession: false });
  mockMaybeSingle.mockResolvedValue({ data: mockProfile('admin'), error: null });
  mockRpc.mockResolvedValue({ data: 'admin', error: null });
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBeFalsy());
  return hook;
}

describe('AuthContext MFA challenge (US-346)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    sessionStorage.clear();
    localStorage.clear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('holds the session and raises a challenge when a factor is enrolled', async () => {
    mfaResponses({ required: true });
    signInFiresEvent();
    const { result } = await renderSignedOut();

    let outcome: { error?: string; mfaRequired?: boolean } = {};
    await act(async () => {
      outcome = await result.current.signIn('test@example.com', 'password123');
    });

    expect(outcome).toEqual({ mfaRequired: true });
    expect(result.current.mfaChallenge).toMatchObject({ userId: mockUser().id, accessToken: 'mock-access-token' });
    // The SIGNED_IN event did not reach the app.
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.userProfile).toBeNull();
    expect(localStorage.getItem(MFA_PENDING_KEY)).toBe(mockUser().id);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('verify-mfa-login');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer mock-access-token');
  });

  it('lets the session in once the challenge is completed', async () => {
    mfaResponses({ required: true });
    signInFiresEvent();
    const { result } = await renderSignedOut();
    await act(async () => { await result.current.signIn('test@example.com', 'password123'); });

    await act(async () => { await result.current.completeMfaChallenge(); });

    expect(result.current.mfaChallenge).toBeNull();
    expect(result.current.user?.id).toBe(mockUser().id);
    await waitFor(() => expect(result.current.userProfile?.id).toBe(mockProfile().id));
    expect(localStorage.getItem(MFA_PENDING_KEY)).toBeNull();
  });

  it('signs the half-session out when the challenge is abandoned', async () => {
    mfaResponses({ required: true });
    signInFiresEvent();
    const { result } = await renderSignedOut();
    await act(async () => { await result.current.signIn('test@example.com', 'password123'); });

    await act(async () => { await result.current.cancelMfaChallenge(); });

    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.mfaChallenge).toBeNull();
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(MFA_PENDING_KEY)).toBeNull();
  });

  it('signs straight in when no factor is enrolled', async () => {
    mfaResponses({ required: false });
    signInFiresEvent();
    const { result } = await renderSignedOut();

    let outcome: { error?: string; mfaRequired?: boolean } = { error: 'unset' };
    await act(async () => { outcome = await result.current.signIn('test@example.com', 'password123'); });

    expect(outcome).toEqual({});
    expect(result.current.mfaChallenge).toBeNull();
    expect(result.current.user?.id).toBe(mockUser().id);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('skips the code on a device the user trusted', async () => {
    localStorage.setItem('bd_device_id', 'device-1');
    mfaResponses({ required: true, trusted: true });
    signInFiresEvent();
    const { result } = await renderSignedOut();

    await act(async () => { await result.current.signIn('test@example.com', 'password123'); });

    expect(result.current.mfaChallenge).toBeNull();
    expect(result.current.user?.id).toBe(mockUser().id);
  });

  it('fails closed when the MFA check cannot be answered', async () => {
    mfaResponses({ required: false, fail: true });
    signInFiresEvent();
    const { result } = await renderSignedOut();

    let outcome: { error?: string; mfaRequired?: boolean } = {};
    await act(async () => { outcome = await result.current.signIn('test@example.com', 'password123'); });

    expect(outcome.error).toMatch(/two-factor/);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.user).toBeNull();
  });

  it('discards a session left behind by an unfinished challenge on reload', async () => {
    localStorage.setItem(MFA_PENDING_KEY, mockUser().id);
    setupDefaultMocks({ hasSession: true });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' }));
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(MFA_PENDING_KEY)).toBeNull();
  });
});
