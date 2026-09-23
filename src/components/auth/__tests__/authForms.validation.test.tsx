import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// US-268: the /auth forms validate through react-hook-form + the schemas in
// src/lib/validations/auth.ts. A bad field shows an inline error and stops the
// submit; a good one reaches the same AuthContext call with the same arguments.

const h = vi.hoisted(() => ({ rpc: vi.fn() }));
let authState: Record<string, unknown>;

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: {}, from: vi.fn(), rpc: (...a: unknown[]) => h.rpc(...a) },
  getEdgeFunctionUrl: (fn: string) => `https://api.brikly.net/functions/v1/${fn}`,
  supabaseAnonKey: 'anon',
}));
vi.mock('@/components/auth/AuthBrandingPanel', () => ({ default: () => null }));
vi.mock('@/components/auth/OAuthButtons', () => ({ OAuthButtons: () => null }));

import Auth from '@/pages/Auth';
import PasswordResetFlow from '../PasswordResetFlow';

const signIn = vi.fn();
const signUp = vi.fn();
const resetPassword = vi.fn();

const renderAuth = (path = '/auth') => {
  window.history.replaceState({}, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Auth />
    </MemoryRouter>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  authState = {
    user: null, userProfile: null, session: null, loading: false,
    signIn, signInWithGoogle: vi.fn(), signInWithApple: vi.fn(), signUp,
    resetPassword, resetPasswordWithOTP: vi.fn(), verifyOTP: vi.fn(), resendOTP: vi.fn(),
    mfaChallenge: null, completeMfaChallenge: vi.fn(), cancelMfaChallenge: vi.fn(),
  };
  signIn.mockResolvedValue({ error: null, mfaRequired: true });
  signUp.mockResolvedValue({ error: null, expiresInMinutes: 15 });
  resetPassword.mockResolvedValue({ error: null, expiresInMinutes: 10 });
  h.rpc.mockResolvedValue({ data: false, error: null });
});

describe('SignInForm', () => {
  it('shows inline errors and does not call signIn for an empty form', async () => {
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    const email = screen.getByLabelText('Email', { exact: true });
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-describedby', 'signin-email-error');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('rejects a malformed email inline', async () => {
    const user = userEvent.setup();
    renderAuth();
    await user.type(screen.getByLabelText('Email', { exact: true }), 'dana@reyesbuild');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'hunter2');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('calls signIn with the typed email and password', async () => {
    const user = userEvent.setup();
    renderAuth();
    await user.type(screen.getByLabelText('Email', { exact: true }), 'dana@reyesbuild.com');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'hunter2');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('dana@reyesbuild.com', 'hunter2'));
    expect(signIn).toHaveBeenCalledTimes(1);
  });
});

describe('SignUpForm', () => {
  const fill = async (user: ReturnType<typeof userEvent.setup>, first: string) => {
    if (first) await user.type(screen.getByLabelText('First name'), first);
    await user.type(screen.getByLabelText('Last name'), 'Reyes');
    await user.type(screen.getByLabelText('Work email'), 'dana@reyesbuild.com');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'Str0ng-enough!');
    await user.click(screen.getByRole('checkbox', { name: /I agree to the Terms of Service/ }));
  };

  it('blocks a blank first name inline', async () => {
    const user = userEvent.setup();
    renderAuth('/auth?tab=signup');
    await fill(user, '');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toHaveAttribute('aria-invalid', 'true');
    expect(signUp).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it('sends the same signUp call, terms flag included', async () => {
    const user = userEvent.setup();
    renderAuth('/auth?tab=signup');
    await fill(user, 'Dana');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith('dana@reyesbuild.com', 'Str0ng-enough!', {
        first_name: 'Dana',
        last_name: 'Reyes',
        terms_accepted: true,
      }),
    );
    expect(h.rpc).toHaveBeenCalledWith('is_disposable_email_domain', { p_email: 'dana@reyesbuild.com' });
    // The OTP step still shows the address the form sent.
    expect(await screen.findByText('dana@reyesbuild.com')).toBeInTheDocument();
  });
});

describe('PasswordResetFlow', () => {
  it('blocks a malformed reset email inline', async () => {
    const user = userEvent.setup();
    renderAuth('/auth?tab=forgot');
    await user.type(screen.getByLabelText('Email address'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send reset code' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('requests a code for the typed address', async () => {
    const user = userEvent.setup();
    renderAuth('/auth?tab=forgot');
    await user.type(screen.getByLabelText('Email address'), 'dana@reyesbuild.com');
    await user.click(screen.getByRole('button', { name: 'Send reset code' }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('dana@reyesbuild.com'));
    expect(await screen.findByText('Enter reset code')).toBeInTheDocument();
  });

  const renderSetPassword = (newPassword: string, confirmPassword: string, onSetNewPassword = vi.fn()) => {
    const noop = () => {};
    render(
      <PasswordResetFlow
        resetEmail="dana@reyesbuild.com" setResetEmail={noop}
        loading={false} inputClassName=""
        emailSent emailSentType="reset"
        otpFlowState="setting_password" setOtpFlowState={noop}
        otpCode="123456" setOtpCode={noop}
        otpExpiresIn={10} otpResendCooldown={0}
        newPassword={newPassword} setNewPassword={noop}
        confirmPassword={confirmPassword} setConfirmPassword={noop}
        newPasswordValidation={{ isValid: true, errors: [] }}
        onSubmitReset={noop} onVerifyResetOTP={noop}
        onSetNewPassword={(e) => { e.preventDefault(); onSetNewPassword(); }}
        onResendResetOTP={noop} onResetFlow={noop} onSwitchToSignIn={noop}
        onNewPasswordChange={noop} renderPasswordRequirements={() => null}
      />,
    );
    return onSetNewPassword;
  };

  it('does not set a password when the confirmation is empty', async () => {
    const onSet = renderSetPassword('Str0ng-enough!', '');
    fireEvent.submit(screen.getByRole('form', { name: 'Set new password form' }));

    expect(await screen.findByText('Confirm your new password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('aria-invalid', 'true');
    expect(onSet).not.toHaveBeenCalled();
  });

  it('hands a matching, valid pair to the page', async () => {
    const onSet = renderSetPassword('Str0ng-enough!', 'Str0ng-enough!');
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    await waitFor(() => expect(onSet).toHaveBeenCalledTimes(1));
  });
});
