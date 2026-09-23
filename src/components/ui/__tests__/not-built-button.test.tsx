import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotBuiltButton } from '../not-built-button';

describe('NotBuiltButton (US-371)', () => {
  it('renders a disabled button that says the feature is not built', () => {
    render(<NotBuiltButton feature="Schedule settings">Settings</NotBuiltButton>);
    const button = screen.getByRole('button', { name: /settings/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Schedule settings is not built yet.');
  });
});
