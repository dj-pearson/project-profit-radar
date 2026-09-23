/**
 * US-219: render counts for AuthContext consumers.
 *
 * A token refresh (TOKEN_REFRESHED) hands the provider a new Session and a
 * new, field-for-field identical User object. Before US-219 that new User
 * identity reached every useAuth() consumer and every effect keyed on
 * `user`. These tests pin how many renders each hook costs on a refresh.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import {
  AuthProvider,
  useAuth,
  useAuthActions,
  useAuthSession,
  useAuthState,
} from '../AuthContext';

const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(() => ({ select: mockSelect })),
    rpc: vi.fn(),
  },
  getEdgeFunctionUrl: (fn: string) => `https://api.brikly.net/functions/v1/${fn}`,
  supabaseAnonKey: 'test-anon-key',
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useGoogleAnalytics', () => ({ gtag: { trackAuth: vi.fn() } }));
vi.mock('@/lib/routeMemory', () => ({ clearRememberedRoute: vi.fn() }));
vi.mock('@/lib/sentry', () => ({ setSentryUser: vi.fn(), clearSentryUser: vi.fn() }));
vi.mock('@/services/errorLoggingService', () => ({ setErrorLoggingUser: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

// Built fresh on every call, as supabase-js does on each refresh.
const makeUser = () => ({
  id: USER_ID,
  email: 'test@example.com',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01',
});

const makeSession = (token: string) => ({
  access_token: token,
  refresh_token: `refresh-${token}`,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: makeUser(),
});

const makeProfile = () => ({
  id: USER_ID,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  phone: null,
  company_id: '660e8400-e29b-41d4-a716-446655440001',
  role: 'admin',
  is_active: true,
});

let authStateCallback: ((event: string, session: unknown) => Promise<void> | void) | null = null;

const counts = { full: 0, state: 0, session: 0, actions: 0 };
const seen: { users: unknown[]; profiles: unknown[]; actions: unknown[] } = {
  users: [],
  profiles: [],
  actions: [],
};
let latestActions: ReturnType<typeof useAuthActions> | null = null;
let latestState: ReturnType<typeof useAuthState> | null = null;

// Each consumer is memoized so only a context change can re-render it.
const FullConsumer = React.memo(function FullConsumer() {
  const { user } = useAuth();
  counts.full++;
  return <span>{user?.id}</span>;
});

const StateConsumer = React.memo(function StateConsumer() {
  const state = useAuthState();
  counts.state++;
  latestState = state;
  seen.users.push(state.user);
  seen.profiles.push(state.userProfile);
  return <span>{state.userProfile?.role}</span>;
});

const SessionConsumer = React.memo(function SessionConsumer() {
  const session = useAuthSession();
  counts.session++;
  return <span>{session?.access_token}</span>;
});

const ActionsConsumer = React.memo(function ActionsConsumer() {
  const actions = useAuthActions();
  counts.actions++;
  latestActions = actions;
  seen.actions.push(actions);
  return null;
});

function renderAll() {
  return render(
    <AuthProvider>
      <FullConsumer />
      <StateConsumer />
      <SessionConsumer />
      <ActionsConsumer />
    </AuthProvider>
  );
}

function resetCounts() {
  counts.full = 0;
  counts.state = 0;
  counts.session = 0;
  counts.actions = 0;
  seen.users = [];
  seen.profiles = [];
  seen.actions = [];
}

async function renderSignedIn() {
  const utils = renderAll();
  await waitFor(() => {
    expect(latestState?.userProfile?.role).toBe('admin');
    expect(latestState?.loading).toBe(false);
  });
  return utils;
}

describe('AuthContext re-renders (US-219)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    resetCounts();
    latestActions = null;
    latestState = null;
    mockOnAuthStateChange.mockImplementation((cb: typeof authStateCallback) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockGetSession.mockResolvedValue({ data: { session: makeSession('t0') }, error: null });
    mockMaybeSingle.mockImplementation(() => Promise.resolve({ data: makeProfile(), error: null }));
    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    authStateCallback = null;
  });

  it('a token refresh re-renders only session readers', async () => {
    await renderSignedIn();
    const userBefore = seen.users[seen.users.length - 1];
    resetCounts();

    await act(async () => {
      await authStateCallback!('TOKEN_REFRESHED', makeSession('t1'));
    });

    // The session did change, so its readers (and the backward-compatible
    // useAuth(), which carries session) see it once.
    expect(counts.session).toBe(1);
    expect(counts.full).toBe(1);
    // A reader of user/profile/loading and a reader of the actions do not.
    expect(counts.state).toBe(0);
    expect(counts.actions).toBe(0);
    expect(latestState?.user).toBe(userBefore);
  });

  it('keeps the user identity when a refreshed session carries an equal user', async () => {
    await renderSignedIn();
    const before = latestState?.user;

    await act(async () => {
      await authStateCallback!('TOKEN_REFRESHED', makeSession('t2'));
      await authStateCallback!('TOKEN_REFRESHED', makeSession('t3'));
    });

    expect(latestState?.user).toBe(before);
  });

  it('still hands out a new user when the user actually changed', async () => {
    await renderSignedIn();
    const before = latestState?.user;
    resetCounts();

    const changed = makeSession('t4');
    changed.user.email = 'new@example.com';
    await act(async () => {
      await authStateCallback!('USER_UPDATED', changed);
    });

    expect(latestState?.user).not.toBe(before);
    expect(latestState?.user?.email).toBe('new@example.com');
    expect(counts.state).toBeGreaterThan(0);
    expect(counts.actions).toBe(0);
  });

  it('action identities survive sign-in, refresh and profile reload', async () => {
    await renderSignedIn();
    const first = latestActions!;

    await act(async () => {
      await authStateCallback!('TOKEN_REFRESHED', makeSession('t5'));
    });
    await act(async () => {
      await latestActions!.refreshProfile();
    });

    expect(latestActions).toBe(first);
    expect(new Set(seen.actions).size).toBe(1);
  });

  it('refreshProfile with an unchanged row keeps the profile identity', async () => {
    await renderSignedIn();
    const before = latestState?.userProfile;

    await act(async () => {
      await latestActions!.refreshProfile();
    });

    expect(mockMaybeSingle).toHaveBeenCalledTimes(2);
    expect(latestState?.userProfile).toBe(before);
  });

  it('refreshProfile still applies a changed row', async () => {
    await renderSignedIn();
    mockMaybeSingle.mockImplementation(() =>
      Promise.resolve({ data: { ...makeProfile(), role: 'project_manager' }, error: null })
    );

    await act(async () => {
      await latestActions!.refreshProfile();
    });

    expect(latestState?.userProfile?.role).toBe('project_manager');
  });

  it('useAuth() still returns the full backward-compatible shape', async () => {
    let value: ReturnType<typeof useAuth> | null = null;
    function Probe() {
      value = useAuth();
      return null;
    }
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(value?.userProfile?.role).toBe('admin'));

    expect(Object.keys(value!).sort()).toEqual(
      [
        'user',
        'session',
        'userProfile',
        'loading',
        'signIn',
        'signInWithGoogle',
        'signInWithApple',
        'signUp',
        'signOut',
        'resetPassword',
        'resetPasswordWithOTP',
        'updateProfile',
        'refreshProfile',
        'mfaChallenge',
        'completeMfaChallenge',
        'cancelMfaChallenge',
        'sendOTP',
        'verifyOTP',
        'resendOTP',
      ].sort()
    );
    expect(value!.session?.access_token).toBe('t0');
  });

  it('the slice hooks throw outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Bad() {
      useAuthState();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/within an AuthProvider/);
    spy.mockRestore();
  });
});
