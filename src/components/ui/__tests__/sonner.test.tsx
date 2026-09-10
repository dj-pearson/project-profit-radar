import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster, toast } from '@/components/ui/sonner';

/**
 * US-373: the sonner host was never mounted in App.tsx, so every toast() call
 * from the ~40 components that import it rendered nowhere. This guards the
 * host itself — if the wrapper stops rendering a live sonner region, or its
 * theme wiring throws outside ThemeProvider, these fail.
 */
describe('sonner Toaster', () => {
  it('renders a toast that the user can actually see', async () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    toast.success('Fiscal period saved');

    await waitFor(() =>
      expect(screen.getByText('Fiscal period saved')).toBeInTheDocument()
    );
  });

  it('mounts a sonner toaster region once a toast is queued', async () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    toast.error('Could not save fiscal period');

    await waitFor(() =>
      expect(document.querySelector('[data-sonner-toaster]')).not.toBeNull()
    );
  });
});
