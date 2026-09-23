import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// US-346: a sign-in that needs MFA puts a challenge on the auth context, and
// the sign-in page must show it. Closing it must drop the half-session.

const completeMfaChallenge = vi.fn();
const cancelMfaChallenge = vi.fn();
const CHALLENGE = { userId: '550e8400-e29b-41d4-a716-446655440000', email: 'dana@reyesbuild.com', accessToken: 'held-token' };
let authState: Record<string, unknown>;

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: {}, from: vi.fn() },
  getEdgeFunctionUrl: (fn: string) => `https://api.brikly.net/functions/v1/${fn}`,
  supabaseAnonKey: 'anon',
}));
vi.mock('@/components/auth/AuthBrandingPanel', () => ({ default: () => null }));
vi.mock('@/components/auth/OAuthButtons', () => ({ OAuthButtons: () => null }));

import Auth from '../Auth';

const base = {
  user: null, userProfile: null, session: null, loading: false,
  signIn: vi.fn(), signInWithGoogle: vi.fn(), signInWithApple: vi.fn(), signUp: vi.fn(),
  resetPassword: vi.fn(), resetPasswordWithOTP: vi.fn(), verifyOTP: vi.fn(), resendOTP: vi.fn(),
  completeMfaChallenge, cancelMfaChallenge,
};

const renderAuth = () => render(<MemoryRouter initialEntries={['/auth']}><Auth /></MemoryRouter>);

describe('Auth page MFA challenge (US-346)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { ...base, mfaChallenge: null };
  });

  it('shows no challenge for an ordinary sign-in', () => {
    renderAuth();
    expect(screen.queryByText('Two-Factor Authentication')).toBeNull();
  });

  it('shows the challenge when the account has a factor enrolled', async () => {
    authState = { ...base, mfaChallenge: CHALLENGE };
    renderAuth();
    await waitFor(() => expect(screen.getByText('Two-Factor Authentication')).toBeTruthy());
    expect(screen.getByText(/6-digit code from your authenticator app/)).toBeTruthy();
    // Focus lands on digit 1 at open, not later: a deferred focus() used to
    // fire mid-entry and swallow a digit.
    expect(document.activeElement).toBe(screen.getByLabelText('Digit 1 of 6'));
  });

  it('sends the held token, not a body user id alone, and completes on success', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, verified: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    authState = { ...base, mfaChallenge: CHALLENGE };
    const user = userEvent.setup();
    renderAuth();

    for (let i = 0; i < 6; i++) {
      await user.type(await screen.findByLabelText(`Digit ${i + 1} of 6`), String(i + 1));
    }

    await waitFor(() => expect(completeMfaChallenge).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer held-token');
    vi.unstubAllGlobals();
  });
});
