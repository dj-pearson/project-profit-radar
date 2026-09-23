import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InviteMemberForm } from '../InviteMemberForm';
import {
  teamInviteSchema,
  buildTeamInviteBody,
  EMPTY_TEAM_INVITE,
  type TeamInviteValues,
} from '@/lib/validations/users';

// The page owns the form; this mirrors how TeamManagement.tsx builds it.
function Harness({
  onSubmit,
  defaults = {},
}: {
  onSubmit: (v: TeamInviteValues) => void;
  defaults?: Partial<TeamInviteValues>;
}) {
  const form = useForm<TeamInviteValues>({
    resolver: zodResolver(teamInviteSchema),
    defaultValues: { ...EMPTY_TEAM_INVITE, ...defaults },
  });
  return <InviteMemberForm form={form} onSubmit={onSubmit} onCancel={() => {}} submitting={false} />;
}

describe('InviteMemberForm (US-268)', () => {
  it('blocks an empty submit and marks each required field invalid', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Send Invite' }));

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Select a role')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    const first = screen.getByLabelText(/First Name/);
    expect(first).toHaveAttribute('aria-invalid', 'true');
    const message = screen.getByText('First name is required');
    expect(first.getAttribute('aria-describedby')).toContain(message.id);
  });

  it('rejects a malformed email and a short phone number', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} defaults={{ role: 'foreman' }} />);

    await user.type(screen.getByLabelText(/First Name/), 'Dana');
    await user.type(screen.getByLabelText(/Last Name/), 'Reyes');
    await user.type(screen.getByLabelText(/Email Address/), 'dana@');
    await user.type(screen.getByLabelText(/Phone Number/), '555');
    await user.click(screen.getByRole('button', { name: 'Send Invite' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Enter a phone number with at least 10 digits')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid input as the same invite-team-member body as before', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} defaults={{ role: 'foreman' }} />);

    await user.type(screen.getByLabelText(/First Name/), 'Dana');
    await user.type(screen.getByLabelText(/Last Name/), 'Reyes');
    await user.type(screen.getByLabelText(/Email Address/), 'Dana@ReyesBuild.com');
    await user.click(screen.getByRole('button', { name: 'Send Invite' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0] as TeamInviteValues;
    // The useState version sent exactly this: no trimming or lowercasing, and
    // an empty phone as null.
    expect(buildTeamInviteBody(values)).toEqual({
      email: 'Dana@ReyesBuild.com',
      first_name: 'Dana',
      last_name: 'Reyes',
      role: 'foreman',
      phone: null,
    });
  });

  it('passes a phone number through untouched', () => {
    expect(
      buildTeamInviteBody({
        first_name: 'A',
        last_name: 'B',
        email: 'a@b.co',
        role: 'laborer',
        phone: '(555) 123-4567',
      }).phone,
    ).toBe('(555) 123-4567');
  });
});
