import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Stable references: the page's effect depends on user and userProfile, and a
// mock that hands out fresh objects every render re-runs it forever.
const MOCK_USER = { id: 'user-123', email: 'dana@reyesbuild.com' };
const MOCK_PROFILE = {
  id: 'user-123', first_name: 'Dana', last_name: 'Reyes', email: 'dana@reyesbuild.com',
  phone: '', avatar_url: '', company_id: 'co-1', role: 'admin',
};
const refreshProfile = vi.fn().mockResolvedValue(undefined);
const sendOTP = vi.fn();
const MOCK_AUTH = { user: MOCK_USER, userProfile: MOCK_PROFILE, loading: false, refreshProfile, sendOTP };

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => MOCK_AUTH }));
vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/accessibility/AccessiblePageWrapper', () => ({
  AccessiblePageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/legal/PrivacyControls', () => ({ default: () => null }));
vi.mock('@/lib/storage/useStorageUrl', () => ({ useStorageUrl: () => ({ url: null }) }));

const update = vi.fn();
const eq = vi.fn();
const select = vi.fn();
const from = vi.fn();
const invoke = vi.fn();
const signOut = vi.fn();
const updateUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => from(...a),
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    auth: { signOut: (...a: unknown[]) => signOut(...a), updateUser: (...a: unknown[]) => updateUser(...a) },
  },
}));

import UserProfile from '../UserProfile';

describe('UserProfile save (US-362)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue({ update });
    update.mockReturnValue({ eq });
    eq.mockReturnValue({ select });
  });

  it('updates user_profiles filtered on id, not the non-existent user_id', async () => {
    select.mockResolvedValue({ data: [{ id: 'user-123' }], error: null });
    const user = userEvent.setup();
    render(<UserProfile />);

    await user.clear(screen.getByLabelText('First Name'));
    await user.type(screen.getByLabelText('First Name'), 'Dee');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(eq).toHaveBeenCalled());
    expect(from).toHaveBeenCalledWith('user_profiles');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Dee', last_name: 'Reyes' }));
    expect(eq).toHaveBeenCalledWith('id', 'user-123');
    expect(eq).not.toHaveBeenCalledWith('user_id', expect.anything());
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Profile updated' })));
    expect(refreshProfile).toHaveBeenCalled();
  });

  it('surfaces the PostgREST error instead of claiming success', async () => {
    select.mockResolvedValue({ data: null, error: { message: 'column user_profiles.user_id does not exist' } });
    const user = userEvent.setup();
    render(<UserProfile />);

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'column user_profiles.user_id does not exist' }),
      ),
    );
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Profile updated' }));
  });

  it('treats an update that matched no row as a failure', async () => {
    select.mockResolvedValue({ data: [], error: null });
    const user = userEvent.setup();
    render(<UserProfile />);

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Profile updated' }));
  });
});

describe('UserProfile password change (US-347)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendOTP.mockResolvedValue({});
    invoke.mockResolvedValue({ data: { success: true, data: { revokedSessions: 1 } }, error: null });
    signOut.mockResolvedValue({ error: null });
  });

  async function openSecurityTab(user: ReturnType<typeof userEvent.setup>) {
    render(<UserProfile />);
    await user.click(screen.getByRole('tab', { name: /security/i }));
    await user.type(screen.getByLabelText('New Password'), 'N3w-long-passw0rd!');
    await user.type(screen.getByLabelText('Confirm Password'), 'N3w-long-passw0rd!');
  }

  it('emails a reauthentication code first and changes nothing yet', async () => {
    const user = userEvent.setup();
    await openSecurityTab(user);
    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => expect(sendOTP).toHaveBeenCalledWith({ email: 'dana@reyesbuild.com', type: 'reauthentication' }));
    expect(invoke).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('changes the password on the server with the code, then signs out other sessions', async () => {
    const user = userEvent.setup();
    await openSecurityTab(user);
    await user.click(screen.getByRole('button', { name: 'Change Password' }));
    await user.type(await screen.findByLabelText(/Code sent to/), '123456');
    await user.click(screen.getByRole('button', { name: 'Confirm Password Change' }));

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('change-password', {
      body: { otpCode: '123456', newPassword: 'N3w-long-passw0rd!' },
    }));
    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ scope: 'others' }));
    // The browser never sets the password itself.
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('does not sign anyone out when the server refuses the code', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'Edge Function returned a non-2xx status code' } });
    const user = userEvent.setup();
    await openSecurityTab(user);
    await user.click(screen.getByRole('button', { name: 'Change Password' }));
    await user.type(await screen.findByLabelText(/Code sent to/), '000000');
    await user.click(screen.getByRole('button', { name: 'Confirm Password Change' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Password not changed' })));
    expect(signOut).not.toHaveBeenCalled();
  });
});
