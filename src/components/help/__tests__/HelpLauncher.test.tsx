/**
 * US-079: in-app help launcher + contextual tooltip
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelpLauncher } from '@/components/help/HelpLauncher';
import { FormFieldHelp } from '@/components/help/HelpTooltip';

describe('HelpLauncher (US-079)', () => {
  it('renders a floating help button on the page', () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <HelpLauncher />
      </MemoryRouter>
    );
    const button = screen.getByRole('button', { name: /open help center/i });
    expect(button).toBeInTheDocument();
    // Fixed, bottom-right placement.
    expect(button.className).toMatch(/fixed/);
    expect(button.className).toMatch(/bottom-4/);
    expect(button.className).toMatch(/right-4/);
  });
});

describe('FormFieldHelp (US-079)', () => {
  it('renders an accessible help trigger for a form field', () => {
    render(<FormFieldHelp content="Cost codes organize expenses by category." />);
    expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument();
  });
});
