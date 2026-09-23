import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { readFileSync } from 'node:fs';

vi.mock('@/lib/security/csrfProtection.tsx', () => ({ CsrfTokenField: () => null }));

import SignUpForm from '../SignUpForm';

function Harness({ onSubmit }: { onSubmit: () => void }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const noop = () => {};
  return (
    <MemoryRouter>
      <SignUpForm
        email="dana@reyesbuild.com" setEmail={noop}
        password="Str0ng-enough!" setPassword={noop}
        firstName="Dana" setFirstName={noop}
        lastName="Reyes" setLastName={noop}
        showPassword={false} setShowPassword={noop}
        loading={false} inputClassName=""
        emailSent={false} emailSentType={null}
        otpFlowState="idle" otpCode="" setOtpCode={noop}
        otpExpiresIn={15} otpResendCooldown={0}
        passwordValidation={{ isValid: true, errors: [] }}
        termsAccepted={termsAccepted} setTermsAccepted={setTermsAccepted}
        showPasswordRequirements={false}
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        onVerifyOTP={noop} onResendOTP={noop} onResetOTPFlow={noop}
        onPasswordChange={noop} onSwitchToSignIn={noop}
        renderOAuthButtons={() => null} renderPasswordRequirements={() => null}
      />
    </MemoryRouter>
  );
}

describe('SignUpForm terms acceptance (US-361)', () => {
  it('keeps Create account disabled until the box is ticked', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    const submit = screen.getByRole('button', { name: 'Create account' });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /I agree to the Terms of Service and Privacy Policy/ }));
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('links the Terms and Privacy pages', () => {
    render(<Harness onSubmit={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });

  it('signup-with-otp stores when and which version was accepted', () => {
    const src = readFileSync('supabase/functions/signup-with-otp/index.ts', 'utf8');
    expect(src).toContain('termsAccepted: z.boolean().optional()');
    expect(src).toMatch(/terms_accepted_at: termsAccepted \? new Date\(\)\.toISOString\(\) : null/);
    expect(src).toContain('terms_version:');
  });
});
